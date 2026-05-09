import { type Hex, useWallet } from '@spacy-computer/sdk'
import { useCallback } from 'react'

interface SpacyUser {
  email: string | undefined
}

interface SpacyAuth {
  ready: boolean
  authenticated: boolean
  user: SpacyUser | null
  walletAddress: Hex | null
  signIn: () => void
  signOut: () => void
}

/**
 * Adapts the @spacy-computer/sdk wallet hook to the existing UI contract.
 *
 * Wallet provisioning is handled inside `SpacyProvider` — on first auth it
 * calls `/wallet/provision` if the user has no wallet yet, so the UI just
 * watches `wallet` go from `null` → populated. No client-side createWallet
 * race like the Privy adapter needed.
 */
export function useSpacyAuth(): SpacyAuth {
  const { user, wallet, ready, login, logout } = useWallet()

  const signIn = useCallback(() => {
    login()
  }, [login])

  const signOut = useCallback(() => {
    void logout()
  }, [logout])

  return {
    ready,
    authenticated: !!user,
    user: user ? { email: user.email } : null,
    walletAddress: wallet ? (wallet.address as Hex) : null,
    signIn,
    signOut,
  }
}
