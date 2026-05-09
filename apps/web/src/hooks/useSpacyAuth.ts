import { useCreateWallet, useLoginWithOAuth, usePrivy, useWallets } from '@privy-io/react-auth'
import type { Hex } from '@spacy/types'
import { useCallback, useEffect, useRef } from 'react'

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
  const { createWallet } = useCreateWallet()
  const provisioningRef = useRef(false)

  const embedded = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0]
  const walletAddress = embedded ? (embedded.address as Hex) : null

  // If a user is authenticated but no embedded wallet exists yet (e.g. they signed up
  // before embedded wallets were enabled in the dashboard), provision one explicitly.
  useEffect(() => {
    if (!ready || !authenticated) return
    if (wallets.length > 0) return
    if (provisioningRef.current) return
    provisioningRef.current = true
    createWallet().catch((err: unknown) => {
      console.error('createWallet failed', err)
      provisioningRef.current = false
    })
  }, [ready, authenticated, wallets.length, createWallet])

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
