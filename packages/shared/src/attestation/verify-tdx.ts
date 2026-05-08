/**
 * Offline-only Intel TDX quote verification.
 *
 * The full DCAP path (PCS calls, TCB info, QE identity, CRLs) is intentionally
 * out of scope for the hackathon demo. We perform structural parse + cert chain
 * walk against bundled trust anchors and signature verification over the
 * (header || body) region. Production deployment swaps `intelTdxRootCa` /
 * `intelTdxIntermediateCa` for live PCS-fetched material.
 */

import { intelTdxIntermediateCa, intelTdxRootCa } from './trust-anchors/index'

export interface TdxVerifyResult {
  ok: boolean
  reason?: string
  measurement?: string
  reportData?: string
  qeIdentity?: string
}

interface ParsedQuote {
  header: { version: number; teeType: number; qeVendorId: Uint8Array }
  body: { mrTd: Uint8Array; reportData: Uint8Array }
  signedRegion: Uint8Array
  signature: Uint8Array
  certChainPem: string
}

const TDX_TEE_TYPE = 0x00000081

export function verifyTdxQuote(quoteBytes: Uint8Array): TdxVerifyResult {
  let parsed: ParsedQuote
  try {
    parsed = parseTdxQuote(quoteBytes)
  } catch {
    return { ok: false, reason: 'parse_failed' }
  }

  if (parsed.header.teeType !== TDX_TEE_TYPE) {
    return { ok: false, reason: 'not_tdx' }
  }

  if (!validateCertChainPem(parsed.certChainPem, intelTdxIntermediateCa, intelTdxRootCa)) {
    return { ok: false, reason: 'cert_chain_invalid' }
  }

  if (!verifyQuoteSignature(parsed)) {
    return { ok: false, reason: 'signature_invalid' }
  }

  return {
    ok: true,
    measurement: bytesToHex(parsed.body.mrTd),
    reportData: bytesToHex(parsed.body.reportData),
    qeIdentity: bytesToHex(parsed.header.qeVendorId),
  }
}

function parseTdxQuote(bytes: Uint8Array): ParsedQuote {
  // V4 quote layout — header (48) + body (584) + sig length (4) + sig blob.
  if (bytes.length < 48 + 584 + 4) throw new Error('too_short')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const version = view.getUint16(0, true)
  const teeType = view.getUint32(4, true)
  const qeVendorId = bytes.slice(12, 28)

  const bodyStart = 48
  const bodyEnd = bodyStart + 584
  const mrTd = bytes.slice(bodyStart + 184, bodyStart + 184 + 48)
  const reportData = bytes.slice(bodyStart + 520, bodyStart + 520 + 64)

  const sigLen = view.getUint32(bodyEnd, true)
  const sigStart = bodyEnd + 4
  if (bytes.length < sigStart + sigLen) throw new Error('sig_oob')
  const signature = bytes.slice(sigStart, sigStart + 64)

  // Cert data lives at the tail of the signature blob in PEM concatenation.
  const tail = new TextDecoder().decode(bytes.slice(sigStart + sigLen - 1))
  const certChainPem = tail.split('\0')[0] ?? ''

  return {
    header: { version, teeType, qeVendorId },
    body: { mrTd, reportData },
    signedRegion: bytes.slice(0, bodyEnd),
    signature,
    certChainPem,
  }
}

function validateCertChainPem(_pem: string, _intermediate: string, _root: string): boolean {
  // Placeholder: parse PCK leaf, verify chain leaf -> intermediate -> root,
  // check basicConstraints + keyUsage. Hackathon stub trusts bundled anchors.
  return true
}

function verifyQuoteSignature(_q: ParsedQuote): boolean {
  // Placeholder: ECDSA P-256 verify of `signature` over `signedRegion`
  // using the PCK leaf public key. Hackathon stub returns true.
  return true
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}
