import passport from 'passport'
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20'
import { prisma } from '../prisma/client'
import { env } from './env'

export interface AuthedUser {
  id: string
  email: string
  googleSub: string
}

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['openid', 'email', 'profile'],
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (err: Error | null, user?: AuthedUser) => void,
    ) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) return done(new Error('google_profile_missing_email'))

        const user = await prisma.user.upsert({
          where: { googleSub: profile.id },
          create: {
            googleSub: profile.id,
            email,
            name: profile.displayName ?? null,
          },
          update: {
            email,
            name: profile.displayName ?? null,
            lastLoginAt: new Date(),
          },
          select: { id: true, email: true, googleSub: true },
        })

        done(null, user)
      } catch (err) {
        done(err as Error)
      }
    },
  ),
)

// We do not use sessions; passport is just used as a strategy adapter for the
// OAuth dance, then we issue our own JWT cookie.
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user as AuthedUser))

export { passport }
