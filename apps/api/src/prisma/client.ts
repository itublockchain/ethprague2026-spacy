import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

declare global {
  var __spacyPrisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__spacyPrisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalThis.__spacyPrisma = prisma
}
