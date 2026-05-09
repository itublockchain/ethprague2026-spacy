import { spacyAttestationsAbi } from '@spacy/shared/abis'
import { createPublicClient, createWalletClient, getContract, type Hex, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { env } from '../config/env'
import { ChainError } from '../lib/errors'
import { logger } from '../lib/logger'

const transport = http(env.RPC_URL)

const chain =
  env.CHAIN_ID === sepolia.id ? sepolia : { ...sepolia, id: env.CHAIN_ID, name: 'custom' }

export const publicClient = createPublicClient({ chain, transport })

const relayerAccount = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as Hex)

export const walletClient = createWalletClient({
  account: relayerAccount,
  chain,
  transport,
})

export const relayerAddress = relayerAccount.address

const attestationContract = getContract({
  address: env.ATTESTATION_CONTRACT_ADDRESS as Hex,
  abi: spacyAttestationsAbi,
  client: { public: publicClient, wallet: walletClient },
})

export interface PublishResult {
  onchainTxHash: Hex
  blockNumber: number
}

export async function publishAttestation(input: {
  wallet: Hex
  txHash: Hex
  cid: string
}): Promise<PublishResult> {
  try {
    const onchainTxHash = await attestationContract.write.publish([
      input.wallet,
      input.txHash,
      input.cid,
    ])

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: onchainTxHash,
      timeout: 60_000,
    })

    if (receipt.status !== 'success') {
      throw new ChainError({ status: receipt.status }, 'attestation_publish_reverted')
    }

    return {
      onchainTxHash,
      blockNumber: Number(receipt.blockNumber),
    }
  } catch (err) {
    if (err instanceof ChainError) throw err
    logger.warn({ err }, 'publishAttestation failed')
    throw new ChainError(err, 'attestation_publish_failed')
  }
}
