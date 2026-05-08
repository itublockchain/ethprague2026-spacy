import { signDigestRequestSchema } from '@spacy/shared/schemas'
import { Router } from 'express'
import { requireAuth, requireAuthedUser } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { signDigestForUser } from '../services/attestation'

export const signRouter: Router = Router()

signRouter.post(
  '/digest',
  requireAuth,
  validateBody(signDigestRequestSchema),
  async (req, res, next) => {
    try {
      const result = await signDigestForUser({
        userId: requireAuthedUser(req).id,
        digest: req.body.digest,
        txMetadata: req.body.txMetadata,
      })
      res.json({ signature: result.signature, slug: result.slug })
    } catch (err) {
      next(err)
    }
  },
)
