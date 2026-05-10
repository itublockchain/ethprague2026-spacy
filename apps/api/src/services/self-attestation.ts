import { execFileSync } from 'node:child_process'
import { createHash, randomBytes, X509Certificate } from 'node:crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from '../config/env'
import { logger } from '../lib/logger'

export interface SelfAttestation {
  vendor: 'amd-sev-snp'
  reportHex: string
  /** Full PEM cert chain VCEK -> ASK -> ARK fetched from AMD KDS. */
  vlek: string
  /** Hex chip ID extracted from the SEV-SNP report (offset 0x1A0). */
  chipIdHex: string | null
  measuredBootHash: string
  fetchedAt: string
  expiresAt: string
  ec2InstanceId: string | null
  mock: boolean
}

let cached: SelfAttestation | null = null

export async function fetchSelfAttestation(): Promise<SelfAttestation> {
  if (cached && new Date(cached.expiresAt) > new Date()) return cached

  if (env.MOCK_ATTESTATION) {
    cached = buildMockReport()
    logger.warn(
      { measuredBootHash: cached.measuredBootHash },
      'using mock SEV-SNP report (MOCK_ATTESTATION=true)',
    )
    return cached
  }

  // sev-guest-get-report writes the binary report to disk. We feed a fresh
  // 64-byte nonce as data-file (its sha512 ends up as the report's user_data
  // field, binding the report to this exact request) and read the 1184-byte
  // output back as hex.
  const nonce = randomBytes(64).toString('hex')
  const dataFile = join(tmpdir(), `spacy-nonce-${process.pid}-${Date.now()}`)
  const outFile = join(tmpdir(), `spacy-report-${process.pid}-${Date.now()}`)

  let reportBytes: Buffer
  try {
    writeFileSync(dataFile, nonce, 'utf8')
    execFileSync('sev-guest-get-report', ['-f', dataFile, outFile], { stdio: 'pipe' })
    reportBytes = readFileSync(outFile)
  } catch (err) {
    logger.error({ err }, 'sev-guest fetch failed; falling back to mock')
    cached = buildMockReport()
    return cached
  } finally {
    try {
      unlinkSync(dataFile)
    } catch {}
    try {
      unlinkSync(outFile)
    } catch {}
  }

  const reportHex = reportBytes.toString('hex')
  const measuredBootHash = extractMeasurement(reportBytes)
  const chipIdHex = extractChipId(reportBytes)
  const ec2InstanceId = await fetchEc2InstanceId()

  // Best-effort VCEK + ASK + ARK fetch from AMD KDS. Failures degrade the
  // receipt's `vlek` field to "" but the report itself is still verifiable
  // by anyone willing to re-fetch from KDS using `chipIdHex`.
  const vlek = await fetchVlekChain(reportBytes).catch((err) => {
    logger.warn({ err, chipIdHex }, 'KDS VLEK fetch failed')
    return ''
  })

  const now = new Date()
  cached = {
    vendor: 'amd-sev-snp',
    reportHex,
    vlek,
    chipIdHex,
    measuredBootHash,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + env.SELF_ATTESTATION_REFRESH_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    ec2InstanceId,
    mock: false,
  }

  logger.info(
    { measuredBootHash, chipIdHex, vlekLen: vlek.length, ec2InstanceId },
    'self-attestation refreshed',
  )
  return cached
}

function extractMeasurement(report: Buffer): string {
  // SEV-SNP report v5: measurement at offset 0x90, 48 bytes.
  return report.subarray(0x90, 0x90 + 48).toString('hex')
}

function extractChipId(report: Buffer): string | null {
  // chip_id at offset 0x1A0, 64 bytes.
  if (report.length < 0x1a0 + 64) return null
  return report.subarray(0x1a0, 0x1a0 + 64).toString('hex')
}

interface TcbVersion {
  blSpl: number
  teeSpl: number
  snpSpl: number
  ucodeSpl: number
}

function extractCurrentTcb(report: Buffer): TcbVersion | null {
  // current_tcb at offset 0x1F8, 8 bytes; struct layout:
  //   byte 0: bl_spl   (boot loader)
  //   byte 1: tee_spl  (TEE, e.g. SEV/SNP firmware)
  //   bytes 2..5: reserved
  //   byte 6: snp_spl
  //   byte 7: ucode_spl
  if (report.length < 0x1f8 + 8) return null
  const tcb = report.subarray(0x1f8, 0x1f8 + 8)
  const blSpl = tcb[0]
  const teeSpl = tcb[1]
  const snpSpl = tcb[6]
  const ucodeSpl = tcb[7]
  if (blSpl === undefined || teeSpl === undefined || snpSpl === undefined || ucodeSpl === undefined)
    return null
  return { blSpl, teeSpl, snpSpl, ucodeSpl }
}

/**
 * Fetch VCEK + ASK + ARK from AMD's Key Distribution Service (KDS) and
 * return the full PEM chain. KDS exposes:
 *   GET /vcek/v1/{family}/{chipIdHex}?ucodeSPL=&snpSPL=&teeSPL=&blSPL=
 *     -> DER-encoded VCEK certificate (binary, application/octet-stream)
 *   GET /vcek/v1/{family}/cert_chain
 *     -> ASK + ARK as PEM concatenation (text)
 *
 * AMD KDS rate-limits to ~1 req/sec/IP, so we cache the result for the full
 * `SELF_ATTESTATION_REFRESH_HOURS` window via the outer `cached` object.
 *
 * Family detection: AWS c6a/m6a use AMD EPYC 3rd gen "Milan". m7a/c7a use
 * "Genoa". We default to Milan and fall through to Genoa on a 404, which
 * lets us survive a future instance type swap without code change.
 */
async function fetchVlekChain(report: Buffer): Promise<string> {
  const chipId = extractChipId(report)
  const tcb = extractCurrentTcb(report)
  if (!chipId || !tcb) {
    logger.warn('cannot extract chipId/TCB from report; skipping KDS fetch')
    return ''
  }

  const families = ['Milan', 'Genoa'] as const
  for (const family of families) {
    const result = await fetchVlekForFamily(family, chipId, tcb)
    if (result) return result
  }
  return ''
}

async function fetchVlekForFamily(
  family: string,
  chipIdHex: string,
  tcb: TcbVersion,
): Promise<string | null> {
  const base = `https://kdsintf.amd.com/vcek/v1/${family}`
  const vcekUrl =
    `${base}/${chipIdHex}` +
    `?ucodeSPL=${tcb.ucodeSpl}&snpSPL=${tcb.snpSpl}` +
    `&teeSPL=${tcb.teeSpl}&blSPL=${tcb.blSpl}`

  // VCEK — DER binary
  const vcekRes = await fetch(vcekUrl, { signal: AbortSignal.timeout(15_000) })
  if (vcekRes.status === 404) {
    logger.debug({ family }, 'KDS VCEK 404, trying next family')
    return null
  }
  if (!vcekRes.ok) {
    logger.warn({ family, status: vcekRes.status }, 'KDS VCEK fetch non-200')
    return null
  }

  const vcekDer = Buffer.from(await vcekRes.arrayBuffer())
  let vcekPem: string
  try {
    vcekPem = new X509Certificate(vcekDer).toString()
  } catch (err) {
    logger.warn({ err }, 'VCEK DER parse failed')
    return null
  }

  // ASK + ARK — PEM concatenation
  const chainRes = await fetch(`${base}/cert_chain`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!chainRes.ok) {
    logger.warn({ family, status: chainRes.status }, 'KDS cert_chain non-200')
    // VCEK alone is still useful, but without ASK/ARK verifier cannot complete
    // the chain. Return empty rather than half-chain.
    return null
  }
  const askArkPem = (await chainRes.text()).trim()

  return `${vcekPem.trim()}\n${askArkPem}\n`
}

async function fetchEc2InstanceId(): Promise<string | null> {
  try {
    const tokenRes = await fetch('http://169.254.169.254/latest/api/token', {
      method: 'PUT',
      headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
      signal: AbortSignal.timeout(500),
    })
    if (!tokenRes.ok) return null
    const token = await tokenRes.text()

    const idRes = await fetch('http://169.254.169.254/latest/meta-data/instance-id', {
      headers: { 'X-aws-ec2-metadata-token': token },
      signal: AbortSignal.timeout(500),
    })
    return idRes.ok ? await idRes.text() : null
  } catch {
    return null
  }
}

function buildMockReport(): SelfAttestation {
  const reportBytes = randomBytes(1184)
  const reportHex = reportBytes.toString('hex')
  const measurement = createHash('sha384').update('spacy-mock-launch').digest('hex')
  const now = new Date()
  return {
    vendor: 'amd-sev-snp',
    reportHex,
    vlek: '-----BEGIN CERTIFICATE-----\nMOCK_VLEK\n-----END CERTIFICATE-----\n',
    chipIdHex: null,
    measuredBootHash: measurement,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + env.SELF_ATTESTATION_REFRESH_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    ec2InstanceId: null,
    mock: true,
  }
}
