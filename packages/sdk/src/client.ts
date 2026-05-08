import { type Hex, type PublicClient, parseEther } from 'viem'
import { spliceSignature } from './chain/splice'
import { buildUnsigned, digestForUnsigned, toMetadata } from './chain/tx'
import { buildPublicClient, type ChainConfig } from './chain/viem'
import { SpacyApi } from './transport/api'

export interface SpacyClientConfig {
  apiBaseUrl: string
  chainId: number
  rpcUrl?: string
}

export interface WalletInfo {
  address: Hex
  createdAt: string
  provenance: { entropyHash: string; entropySig: string; satelliteSource: string }
}

export interface SignRequest {
  to: Hex
  value?: bigint | string
  data?: Hex
  gas?: bigint
}

export interface SignResult {
  txHash: Hex
  attestationSlug: string
}

export class SpacyClient {
  readonly api: SpacyApi
  readonly publicClient: PublicClient

  constructor(private config: SpacyClientConfig) {
    this.api = new SpacyApi(config.apiBaseUrl.replace(/\/$/, ''))
    const chainCfg: ChainConfig = config.rpcUrl
      ? { chainId: config.chainId, rpcUrl: config.rpcUrl }
      : { chainId: config.chainId }
    this.publicClient = buildPublicClient(chainCfg)
  }

  get chainId(): number {
    return this.config.chainId
  }

  loginUrl(): string {
    return this.api.loginUrl()
  }

  async signAndSend(req: SignRequest, wallet: WalletInfo): Promise<SignResult> {
    const account = wallet.address
    const value = typeof req.value === 'string' ? parseEther(req.value) : (req.value ?? 0n)

    const [nonce, fees] = await Promise.all([
      this.publicClient.getTransactionCount({ address: account }),
      this.publicClient.estimateFeesPerGas(),
    ])

    const unsignedFields = {
      chainId: this.config.chainId,
      nonce,
      to: req.to,
      value,
      data: req.data ?? ('0x' as Hex),
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: req.gas ?? 21_000n,
    }
    const unsigned = buildUnsigned(unsignedFields)

    const digest = digestForUnsigned(unsigned)

    const { signature, slug } = await this.api.signDigest({
      digest,
      txMetadata: toMetadata(unsignedFields),
    })

    const serialized = spliceSignature(unsigned, signature as Hex)

    const txHash = await this.publicClient.sendRawTransaction({
      serializedTransaction: serialized,
    })

    return { txHash, attestationSlug: slug }
  }
}
