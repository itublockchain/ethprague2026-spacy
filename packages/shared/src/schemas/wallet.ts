import { z } from 'zod'

export const hexAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'invalid_address') as unknown as z.ZodType<`0x${string}`>

export const walletProvisionResponseSchema = z.object({
  address: hexAddressSchema,
  createdAt: z.string().datetime(),
  provenance: z.object({
    entropyHash: z.string(),
    entropySig: z.string(),
    satelliteSource: z.string(),
  }),
})

export type WalletProvisionResponse = z.infer<typeof walletProvisionResponseSchema>

export const walletMeResponseSchema = walletProvisionResponseSchema

export type WalletMeResponse = WalletProvisionResponse
