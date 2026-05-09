import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import pinoHttp from 'pino-http'
import { env } from './config/env'
import { passport } from './config/passport'
import { logger } from './lib/logger'
import { errorMiddleware } from './middleware/error'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'
import { proofRouter } from './routes/proof'
import { receiptsRouter } from './routes/receipts'
import { signRouter } from './routes/sign'
import { walletRouter } from './routes/wallet'
import { fetchSelfAttestation } from './services/self-attestation'

const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(pinoHttp({ logger }))
app.use(
  cors({
    origin: env.WEB_BASE_URL,
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: '256kb' }))
app.use(passport.initialize())

app.use(healthRouter)
app.use('/auth', authRouter)
app.use('/wallet', walletRouter)
app.use('/sign', signRouter)
app.use('/receipts', receiptsRouter)
app.use('/proof', proofRouter)

app.use(errorMiddleware)

async function bootstrap() {
  // Warm the SEV-SNP report cache on boot. If we cannot fetch it (and we are
  // not in mock mode) we still come up — the route surfaces the error.
  try {
    const att = await fetchSelfAttestation()
    logger.info({ measurement: att.measuredBootHash, mock: att.mock }, 'self-attestation cached')
  } catch (err) {
    logger.error({ err }, 'self-attestation bootstrap failed')
  }

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, chainId: env.CHAIN_ID }, 'spacy api listening')
  })
}

void bootstrap()
