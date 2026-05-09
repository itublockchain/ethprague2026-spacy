/**
 * Dev-only helper: provisions a test User and mints a session cookie value
 * so we can exercise protected routes without going through Google OAuth.
 * Prints the cookie line; nothing more is logged.
 *
 *   bun apps/api/scripts/mint-test-session.ts
 *
 * Pipe directly into curl with --cookie "$(...)".
 */

import { signSession, SESSION_COOKIE_NAME } from '../src/lib/jwt'
import { prisma } from '../src/prisma/client'

async function main() {
  const email = process.argv[2] ?? 'smoketest@spacy.local'
  const googleSub = process.argv[3] ?? `smoketest-stable-${email}`

  const user = await prisma.user.upsert({
    where: { googleSub },
    create: { googleSub, email, name: 'Smoke Test' },
    update: { email, lastLoginAt: new Date() },
    select: { id: true, email: true, googleSub: true },
  })

  const token = await signSession({
    userId: user.id,
    googleSub: user.googleSub,
    email: user.email,
  })

  // shell-friendly output: only the cookie line, nothing else
  process.stdout.write(`${SESSION_COOKIE_NAME}=${token}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
