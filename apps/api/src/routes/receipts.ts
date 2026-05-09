import { Router } from 'express'
import { AuthError, NotFoundError, ValidationError } from '../lib/errors'
import { requireAuth, requireAuthedUser } from '../middleware/auth'
import { prisma } from '../prisma/client'
import { gatewayUrl } from '../services/ipfs'

export const receiptsRouter: Router = Router()

receiptsRouter.get('/:txHash', requireAuth, async (req, res, next) => {
  try {
    const txHash = req.params.txHash
    if (!txHash) throw new ValidationError({ txHash: 'required' })

    const tx = await prisma.transaction.findUnique({
      where: { txHash },
      include: {
        wallet: { select: { userId: true, address: true } },
        attestation: true,
      },
    })
    if (!tx) throw new NotFoundError('transaction_not_found')
    if (tx.wallet.userId !== requireAuthedUser(req).id) throw new AuthError('forbidden')

    res.json({
      txHash: tx.txHash,
      chainId: tx.chainId,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      walletAddress: tx.wallet.address,
      attestation: tx.attestation
        ? {
            slug: tx.attestation.publicSlug,
            ipfsCid: tx.attestation.ipfsCid,
            ipfsUrl: tx.attestation.ipfsCid ? gatewayUrl(tx.attestation.ipfsCid) : null,
            kmsQuoteVerified: tx.attestation.kmsQuoteVerified,
            onchainTxHash: tx.attestation.onchainTxHash,
            onchainBlockNumber: tx.attestation.onchainBlockNumber,
          }
        : null,
    })
  } catch (err) {
    next(err)
  }
})
