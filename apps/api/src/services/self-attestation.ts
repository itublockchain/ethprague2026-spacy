import { execFileSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from '../config/env'
import { logger } from '../lib/logger'

export interface SelfAttestation {
  vendor: 'amd-sev-snp'
  reportHex: string
  vlek: string
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

  let reportHex: string
  try {
    writeFileSync(dataFile, nonce, 'utf8')
    execFileSync('sev-guest-get-report', ['-f', dataFile, outFile], { stdio: 'pipe' })
    reportHex = readFileSync(outFile).toString('hex')
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

  const vlekPath = '/sys/kernel/security/sev/cert-chain'
  const vlek = existsSync(vlekPath) ? readFileSync(vlekPath, 'utf8') : ''

  const measuredBootHash = extractMeasurement(reportHex)
  const ec2InstanceId = await fetchEc2InstanceId()

  const now = new Date()
  cached = {
    vendor: 'amd-sev-snp',
    reportHex,
    vlek,
    measuredBootHash,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + env.SELF_ATTESTATION_REFRESH_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    ec2InstanceId,
    mock: false,
  }

  logger.info({ measuredBootHash, ec2InstanceId }, 'self-attestation refreshed')
  return cached
}

function extractMeasurement(reportHex: string): string {
  // Measurement at offset 0x90, 48 bytes (96 hex chars).
  const start = 0x90 * 2
  return reportHex.slice(start, start + 96)
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
    measuredBootHash: measurement,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + env.SELF_ATTESTATION_REFRESH_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    ec2InstanceId: null,
    mock: true,
  }
}
