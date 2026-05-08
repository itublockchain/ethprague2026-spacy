import type { PrivyClientConfig } from '@privy-io/react-auth'
import { sepolia } from 'viem/chains'

export const privyConfig: PrivyClientConfig = {
  loginMethods: ['google'],
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'users-without-wallets',
    },
    showWalletUIs: false,
  },
  defaultChain: sepolia,
  supportedChains: [sepolia],
}
