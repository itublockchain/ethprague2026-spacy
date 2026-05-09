import { Router } from 'express'
import { env } from '../config/env'
import { type AuthedUser, passport } from '../config/passport'
import { AuthError } from '../lib/errors'
import { SESSION_COOKIE_NAME, sessionCookieOptions, signSession } from '../lib/jwt'
import { requireAuth, requireAuthedUser } from '../middleware/auth'
import { prisma } from '../prisma/client'

export const authRouter: Router = Router()

authRouter.get('/google', passport.authenticate('google', { session: false }))

authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  async (req, res, next) => {
    try {
      const user = req.user as AuthedUser | undefined
      if (!user) throw new AuthError('oauth_failed')

      const token = await signSession({
        userId: user.id,
        googleSub: user.googleSub,
        email: user.email,
      })

      res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions())
      res.redirect(`${env.WEB_BASE_URL}/auth/success`)
    } catch (err) {
      next(err)
    }
  },
)

authRouter.get('/failure', (_req, res) => {
  res.redirect(`${env.WEB_BASE_URL}/auth/failure`)
})

authRouter.post('/logout', requireAuth, (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions())
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: requireAuthedUser(req).id },
      select: { id: true, email: true, name: true },
    })
    if (!user) throw new AuthError('user_not_found')
    res.json(user)
  } catch (err) {
    next(err)
  }
})
