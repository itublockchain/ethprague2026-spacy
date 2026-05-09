import { createPublicClient, http, type PublicClient } from 'viem'
import { baseSepolia, sepolia } from 'viem/chains'

export interface ChainConfig {
  chainId: number
  rpcUrl?: string
}

export function buildPublicClient(cfg: ChainConfig): PublicClient {
  const chain =
    cfg.chainId === sepolia.id
      ? sepolia
      : cfg.chainId === baseSepolia.id
        ? baseSepolia
        : { ...sepolia, id: cfg.chainId, name: 'custom' }

  return createPublicClient({
    chain,
    transport: http(cfg.rpcUrl),
  }) as PublicClient
}
