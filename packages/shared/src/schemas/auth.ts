import { z } from 'zod'

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
})

export type SessionUser = z.infer<typeof sessionUserSchema>

export const sessionPayloadSchema = z.object({
  sub: z.string().uuid(),
  googleSub: z.string(),
  email: z.string().email(),
  iat: z.number(),
  exp: z.number(),
})

export type SessionPayload = z.infer<typeof sessionPayloadSchema>
