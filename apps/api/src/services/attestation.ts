import { verifyTdxQuote } from '@spacy/shared/attestation'
import type { AttestationReceiptV1, TxMetadata } from '@spacy/shared/schemas'
import { type Hex, keccak256, parseSignature, serializeTransaction } from 'viem'
import { env } from '../config/env'
import { OrbitportError } from '../lib/errors'
import { logger } from '../lib/logger'
import { prisma } from '../prisma/client'
import { publishAttestation } from './chain'
import { pinJson } from './ipfs'
import { type CTrngSample, kmsSign, sampleCTrng } from './orbitport'
import { fetchSelfAttestation } from './self-attestation'

interface SignDigestInput {
  userId: string
  digest: Hex
  txMetadata: TxMetadata
}

export interface SignDigestOutcome {
  signature: Hex
  slug: string
  txHash: Hex
}

export async function signDigestForUser(input: SignDigestInput): Promise<SignDigestOutcome> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: input.userId },
    select: { id: true, kmsKeyId: true, address: true },
  })
  if (!wallet) throw new OrbitportError('wallet_not_provisioned', 'wallet_not_provisioned')

  const signingWitness = await sampleCTrng()
  const { signature, quoteHex } = await kmsSign({
    keyId: wallet.kmsKeyId,
    digest: input.digest,
  })

  const txHash = computeTxHash(input.txMetadata, signature)

  const verifyResult = quoteHex
    ? verifyTdxQuote(Buffer.from(quoteHex.replace(/^0x/, ''), 'hex'))
    : { ok: false, reason: 'quote_unavailable', measurement: undefined }
  if (!verifyResult.ok) {
    logger.warn(
      { txHash, reason: verifyResult.reason },
      'KMS quote verification failed; persisting unverified',
    )
  }

  const tx = await prisma.transaction.create({
    data: {
      walletId: wallet.id,
      txHash,
      chainId: input.txMetadata.chainId,
      status: 'pending',
    },
    select: { id: true, txHash: true },
  })

  const attestation = await prisma.attestation.create({
    data: {
      txHash: tx.txHash,
      kmsQuote: { quoteHex, measurement: verifyResult.measurement ?? null },
      kmsQuoteVerified: verifyResult.ok,
      signingEntropyHash: signingWitness.hash,
      signingEntropySig: signingWitness.satelliteSig,
    },
    select: { id: true, publicSlug: true, txHash: true },
  })

  setImmediate(() => {
    void finalizeAttestation({
      attestationId: attestation.id,
      txHash: attestation.txHash as Hex,
      walletAddress: wallet.address as Hex,
      digest: input.digest,
      signature,
      txMetadata: input.txMetadata,
      signingWitness,
      kmsKeyId: wallet.kmsKeyId,
      kmsQuoteHex: quoteHex,
      quoteVerified: verifyResult.ok,
      measurement: verifyResult.measurement,
    })
  })

  return { signature, slug: attestation.publicSlug, txHash: txHash as Hex }
}

interface FinalizeInput {
  attestationId: string
  txHash: Hex
  walletAddress: Hex
  digest: Hex
  signature: Hex
  txMetadata: TxMetadata
  signingWitness: CTrngSample
  kmsKeyId: string
  kmsQuoteHex: string
  quoteVerified: boolean
  measurement: string | undefined
}

async function finalizeAttestation(input: FinalizeInput) {
  let cid: string | null = null
  try {
    const coordinator = await fetchSelfAttestation()

    const receipt: AttestationReceiptV1 = {
      version: 'spacy-attestation/1',
      spec: env.ATTESTATION_SPEC_URL,
      transaction: {
        chainId: input.txMetadata.chainId,
        txHash: input.txHash,
        from: input.walletAddress,
        to: input.txMetadata.to,
        nonce: input.txMetadata.nonce,
        digestSigned: input.digest,
        signedAt: new Date().toISOString(),
      },
      signer: {
        kind: 'spacecomputer-orbitport-kms',
        keyId: input.kmsKeyId,
        quoteHex: input.kmsQuoteHex,
        quoteVerified: input.quoteVerified,
        ...(input.measurement ? { measurement: input.measurement } : {}),
      },
      coordinator: {
        kind: 'spacy-backend-sev-snp',
        selfAttestation: {
          reportHex: coordinator.reportHex,
          vlek: coordinator.vlek,
          measuredBootHash: coordinator.measuredBootHash,
          ec2InstanceId: coordinator.ec2InstanceId ?? '',
          fetchedAt: coordinator.fetchedAt,
        },
      },
      entropy: {
        source: input.signingWitness.satelliteSource,
        valueHex: input.signingWitness.entropyHex,
        signatureHex: input.signingWitness.satelliteSig,
        fetchedAt: input.signingWitness.timestamp,
      },
      verification: {
        instructions: env.VERIFY_INSTRUCTIONS_URL,
        trustAnchorBundle: env.TRUST_ANCHOR_BUNDLE_CID,
      },
      issuedAt: new Date().toISOString(),
    }

    const pin = await pinJson(receipt, `spacy-attestation-${input.txHash}`)
    cid = pin.cid

    await prisma.attestation.update({
      where: { id: input.attestationId },
      data: { ipfsCid: pin.cid },
    })

    const onchain = await publishAttestation({
      wallet: input.walletAddress,
      txHash: input.txHash,
      cid: pin.cid,
    })

    await prisma.attestation.update({
      where: { id: input.attestationId },
      data: {
        onchainTxHash: onchain.onchainTxHash,
        onchainBlockNumber: onchain.blockNumber,
      },
    })

    logger.info(
      { txHash: input.txHash, cid: pin.cid, onchain: onchain.onchainTxHash },
      'attestation finalized',
    )
  } catch (err) {
    logger.error({ err, txHash: input.txHash, cid }, 'finalizeAttestation failed')
  }
}

function computeTxHash(meta: TxMetadata, signature: Hex): Hex {
  const sig = parseSignature(signature)
  const serialized = serializeTransaction(
    {
      chainId: meta.chainId,
      nonce: meta.nonce,
      to: meta.to,
      value: BigInt(meta.value),
      data: meta.data as Hex,
      maxFeePerGas: BigInt(meta.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(meta.maxPriorityFeePerGas),
      gas: BigInt(meta.gas),
      type: 'eip1559',
    },
    sig,
  )
  return keccak256(serialized)
}
