import type { AttestationReceiptV1 } from '@spacy/shared/schemas'
import { Router } from 'express'
import { NotFoundError } from '../lib/errors'
import { logger } from '../lib/logger'
import { prisma } from '../prisma/client'
import { gatewayUrl } from '../services/ipfs'

export const proofRouter: Router = Router()

proofRouter.get('/:slug', async (req, res, next) => {
  try {
    const att = await prisma.attestation.findUnique({
      where: { publicSlug: req.params.slug },
      include: {
        transaction: {
          select: {
            chainId: true,
            createdAt: true,
            wallet: { select: { address: true } },
          },
        },
      },
    })
    if (!att) throw new NotFoundError('proof_not_found')

    const status = computeStatus({
      ipfsCid: att.ipfsCid,
      onchainTxHash: att.onchainTxHash,
    })

    let receipt: AttestationReceiptV1 | null = null
    if (att.ipfsCid) {
      receipt = await fetchReceiptFromGateway(att.ipfsCid)
    }

    res.json({
      slug: att.publicSlug,
      txHash: att.txHash,
      chainId: att.transaction.chainId,
      walletAddress: att.transaction.wallet.address,
      status,
      ipfsCid: att.ipfsCid,
      ipfsUrl: att.ipfsCid ? gatewayUrl(att.ipfsCid) : null,
      onchainTxHash: att.onchainTxHash,
      onchainBlockNumber: att.onchainBlockNumber,
      kmsQuoteVerified: att.kmsQuoteVerified,
      receipt,
      createdAt: att.createdAt.toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

function computeStatus(input: { ipfsCid: string | null; onchainTxHash: string | null }) {
  if (input.onchainTxHash) return 'complete'
  if (input.ipfsCid) return 'pending_onchain'
  return 'pending_pin'
}

async function fetchReceiptFromGateway(cid: string): Promise<AttestationReceiptV1 | null> {
  try {
    const res = await fetch(gatewayUrl(cid), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return (await res.json()) as AttestationReceiptV1
  } catch (err) {
    logger.warn({ err, cid }, 'failed to fetch receipt from gateway')
    return null
  }
}
