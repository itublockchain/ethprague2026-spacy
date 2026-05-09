import { z } from 'zod'
import { hexAddressSchema } from './wallet'

const hexBytesSchema = z.string().regex(/^0x[a-fA-F0-9]*$/, 'invalid_hex')
const hex32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'invalid_digest')
const bigintStringSchema = z.string().regex(/^\d+$/, 'invalid_bigint')

export const txMetadataSchema = z.object({
  chainId: z.number().int().positive(),
  nonce: z.number().int().nonnegative(),
  to: hexAddressSchema,
  value: bigintStringSchema,
  data: hexBytesSchema.default('0x'),
  maxFeePerGas: bigintStringSchema,
  maxPriorityFeePerGas: bigintStringSchema,
  gas: bigintStringSchema,
})

export type TxMetadata = z.infer<typeof txMetadataSchema>

export const signDigestRequestSchema = z.object({
  digest: hex32Schema,
  txMetadata: txMetadataSchema,
})

export type SignDigestRequest = z.infer<typeof signDigestRequestSchema>

export const signDigestResponseSchema = z.object({
  signature: hexBytesSchema,
  slug: z.string().min(8),
})

export type SignDigestResponse = z.infer<typeof signDigestResponseSchema>
