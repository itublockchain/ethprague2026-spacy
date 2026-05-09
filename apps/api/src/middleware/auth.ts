import type { NextFunction, Request, Response } from 'express'
import { AuthError } from '../lib/errors'
import { SESSION_COOKIE_NAME, verifySession } from '../lib/jwt'
import { prisma } from '../prisma/client'

export interface AuthedUserCtx {
  id: string
  email: string
  googleSub: string
}

export function requireAuthedUser(req: Request): AuthedUserCtx {
  if (!req.authUser) throw new AuthError('no_session')
  return req.authUser
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthedUserCtx
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) return next(new AuthError('no_session'))

  try {
    const payload = await verifySession(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, googleSub: true },
    })
    if (!user) return next(new AuthError('user_not_found'))
    req.authUser = user
    next()
  } catch {
    next(new AuthError('invalid_session'))
  }
}
