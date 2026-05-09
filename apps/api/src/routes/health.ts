import { Router } from 'express'
import { fetchSelfAttestation } from '../services/self-attestation'

export const healthRouter: Router = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

healthRouter.get('/health/attestation', async (_req, res, next) => {
  try {
    const att = await fetchSelfAttestation()
    res.json(att)
  } catch (err) {
    next(err)
  }
})
