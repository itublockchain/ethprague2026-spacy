import pino from 'pino'
import { env } from '../config/env'

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      '*.email',
      '*.googleSub',
      '*.kmsKeyId',
      '*.RELAYER_PRIVATE_KEY',
    ],
    censor: '[redacted]',
  },
})
