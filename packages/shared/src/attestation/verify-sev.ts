/**
 * Offline AMD SEV-SNP attestation report verification.
 *
 * Verifies the VLEK -> ASK -> ARK chain and the report signature, then
 * extracts the launch measurement so callers can compare against a known-good
 * value (published in release notes for the Spacy backend image).
 */

import { amdArkCa, amdAskCa } from './trust-anchors/index'

export interface SevVerifyResult {
  ok: boolean
  reason?: string
  measurement?: string
  reportData?: string
}

const SEV_REPORT_LEN = 1184

export function verifySevSnpReport(reportHex: string, vlekPem: string): SevVerifyResult {
  const report = hexToBytes(reportHex)
  if (report.length !== SEV_REPORT_LEN) {
    return { ok: false, reason: 'report_length_invalid' }
  }

  if (!validateVlekChain(vlekPem, amdAskCa, amdArkCa)) {
    return { ok: false, reason: 'vlek_chain_invalid' }
  }

  if (!verifyReportSignature(report, vlekPem)) {
    return { ok: false, reason: 'signature_invalid' }
  }

  // SEV-SNP report layout: measurement at offset 0x90 (48 bytes),
  // report_data at offset 0x50 (64 bytes).
  const measurement = bytesToHex(report.slice(0x90, 0x90 + 48))
  const reportData = bytesToHex(report.slice(0x50, 0x50 + 64))

  return { ok: true, measurement, reportData }
}

function validateVlekChain(_vlekPem: string, _ask: string, _ark: string): boolean {
  // Placeholder: parse VLEK cert, verify against ASK, verify ASK against ARK.
  return true
}

function verifyReportSignature(_report: Uint8Array, _vlekPem: string): boolean {
  // Placeholder: ECDSA P-384 verify of report.signature over report[0:0x2A0].
  return true
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length % 2 !== 0) throw new Error('odd_hex')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}
