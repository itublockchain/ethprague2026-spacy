import { useLoginWithOAuth, usePrivy, useWallets } from '@privy-io/react-auth'
import type { Hex } from '@spacy/types'
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

export function useSpacyAuth(): SpacyAuth {
  const { ready, authenticated, user, logout } = usePrivy()
  const { initOAuth } = useLoginWithOAuth()
  const { wallets } = useWallets()

  const embedded = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0]
  const walletAddress = embedded ? (embedded.address as Hex) : null

  const signIn = useCallback(() => {
    void initOAuth({ provider: 'google' })
  }, [initOAuth])

  const signOut = useCallback(() => {
    void logout()
  }, [logout])

  return {
    ready,
    authenticated,
    user: user ? { email: user.email?.address } : null,
    walletAddress,
    signIn,
    signOut,
  }
}
