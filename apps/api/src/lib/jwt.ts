import { type SessionPayload, sessionPayloadSchema } from '@spacy/shared/schemas'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '../config/env'

const secret = new TextEncoder().encode(env.JWT_SECRET)
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export interface SignSessionInput {
  userId: string
  googleSub: string
  email: string
}

export async function signSession(input: SignSessionInput): Promise<string> {
  return new SignJWT({ googleSub: input.googleSub, email: input.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret)
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  })
  return sessionPayloadSchema.parse(payload)
}

export const SESSION_COOKIE_NAME = 'spacy_session'

export function sessionCookieOptions(): {
  httpOnly: true
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  domain: string | undefined
  path: '/'
  maxAge: number
} {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  }
}
