import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl || undefined),
})
