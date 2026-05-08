import { Router } from 'express'
import { NotFoundError } from '../lib/errors'
import { requireAuth, requireAuthedUser } from '../middleware/auth'
import { prisma } from '../prisma/client'
import { kmsCreateKey, sampleCTrng } from '../services/orbitport'

export const walletRouter: Router = Router()

walletRouter.post('/provision', requireAuth, async (req, res, next) => {
  try {
    const userId = requireAuthedUser(req).id

    const existing = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        address: true,
        createdAt: true,
        provisioningEntropyHash: true,
        provisioningEntropySig: true,
        provisioningSatelliteSource: true,
      },
    })
    if (existing) {
      return res.json({
        address: existing.address,
        createdAt: existing.createdAt.toISOString(),
        provenance: {
          entropyHash: existing.provisioningEntropyHash,
          entropySig: existing.provisioningEntropySig,
          satelliteSource: existing.provisioningSatelliteSource,
        },
      })
    }

    const witness = await sampleCTrng()
    const key = await kmsCreateKey(`spacy-${userId}`)

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        kmsKeyId: key.keyId,
        address: key.address,
        provisioningEntropyHash: witness.hash,
        provisioningEntropySig: witness.satelliteSig,
        provisioningSatelliteSource: witness.satelliteSource,
      },
      select: {
        address: true,
        createdAt: true,
        provisioningEntropyHash: true,
        provisioningEntropySig: true,
        provisioningSatelliteSource: true,
      },
    })

    res.json({
      address: wallet.address,
      createdAt: wallet.createdAt.toISOString(),
      provenance: {
        entropyHash: wallet.provisioningEntropyHash,
        entropySig: wallet.provisioningEntropySig,
        satelliteSource: wallet.provisioningSatelliteSource,
      },
    })
  } catch (err) {
    next(err)
  }
})

walletRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: requireAuthedUser(req).id },
      select: {
        address: true,
        createdAt: true,
        provisioningEntropyHash: true,
        provisioningEntropySig: true,
        provisioningSatelliteSource: true,
      },
    })
    if (!wallet) throw new NotFoundError('wallet_not_provisioned')

    res.json({
      address: wallet.address,
      createdAt: wallet.createdAt.toISOString(),
      provenance: {
        entropyHash: wallet.provisioningEntropyHash,
        entropySig: wallet.provisioningEntropySig,
        satelliteSource: wallet.provisioningSatelliteSource,
      },
    })
  } catch (err) {
    next(err)
  }
})
