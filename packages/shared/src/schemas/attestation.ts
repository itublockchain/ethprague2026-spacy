import { z } from 'zod'

const hex32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'invalid_hex32')
const hex20Schema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'invalid_address')
const entropyHexSchema = z.string().regex(/^[a-fA-F0-9]{64}$/, 'invalid_entropy')

/**
 * Attestation receipt schema, v1.
 *
 * Pinned to IPFS as `application/json`. The CID is content-addressed, so
 * any verifier can fetch this from any IPFS gateway and reproduce the
 * trust chain offline using the bundled Intel TDX + AMD SEV-SNP roots
 * referenced by `verification.trustAnchorBundle`.
 *
 * Spec URL: https://spacy.computer/spec/attestation/v1
 */
export const attestationReceiptV1Schema = z.object({
  version: z.literal('spacy-attestation/1'),
  spec: z.string().url(),

  transaction: z.object({
    chainId: z.number().int().positive(),
    txHash: hex32Schema,
    from: hex20Schema,
    to: hex20Schema,
    nonce: z.number().int().nonnegative(),
    digestSigned: hex32Schema,
    signedAt: z.string().datetime(),
  }),

  signer: z.object({
    kind: z.literal('spacecomputer-orbitport-kms'),
    keyId: z.string(),
    quoteHex: z.string(),
    quoteVerified: z.boolean(),
    measurement: z.string().optional(),
  }),

  coordinator: z.object({
    kind: z.literal('spacy-backend-sev-snp'),
    selfAttestation: z.object({
      reportHex: z.string(),
      vlek: z.string(),
      measuredBootHash: z.string(),
      ec2InstanceId: z.string(),
      fetchedAt: z.string().datetime(),
    }),
  }),

  entropy: z.object({
    source: z.string(),
    valueHex: entropyHexSchema,
    signatureHex: z.string(),
    fetchedAt: z.string().datetime(),
  }),

  verification: z.object({
    instructions: z.string().url(),
    trustAnchorBundle: z.string(),
  }),

  issuedAt: z.string().datetime(),
})

export type AttestationReceiptV1 = z.infer<typeof attestationReceiptV1Schema>

// Back-compat alias so existing imports keep resolving while we migrate.
export const attestationReceiptSchema = attestationReceiptV1Schema
export type AttestationReceipt = AttestationReceiptV1

export const proofPayloadSchema = z.object({
  slug: z.string(),
  txHash: z.string(),
  chainId: z.number().int(),
  walletAddress: z.string(),
  status: z.enum(['pending_pin', 'pending_onchain', 'complete', 'pin_failed', 'onchain_failed']),
  ipfsCid: z.string().nullable(),
  ipfsUrl: z.string().nullable(),
  onchainTxHash: z.string().nullable(),
  onchainBlockNumber: z.number().int().nullable(),
  kmsQuoteVerified: z.boolean(),
  receipt: attestationReceiptV1Schema.nullable(),
  createdAt: z.string().datetime(),
})

export type ProofPayload = z.infer<typeof proofPayloadSchema>
