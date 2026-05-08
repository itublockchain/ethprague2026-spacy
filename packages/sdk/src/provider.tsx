import type { SessionUser } from '@spacy/shared/schemas'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { SpacyClient, type SpacyClientConfig, type WalletInfo } from './client'

interface SpacyContextValue {
  client: SpacyClient
  user: SessionUser | null
  wallet: WalletInfo | null
  ready: boolean
  refresh: () => Promise<void>
  login: () => void
  logout: () => Promise<void>
}

const SpacyContext = createContext<SpacyContextValue | null>(null)

export interface SpacyProviderProps {
  config: SpacyClientConfig
  children: ReactNode
}

export function SpacyProvider({ config, children }: SpacyProviderProps) {
  // We rebuild the client when the caller swaps API URL or chain. The config
  // object identity is intentionally not in the dep array — callers are
  // expected to pass a stable config (e.g. inline object literal at root).
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  const client = useMemo(() => new SpacyClient(config), [config.apiBaseUrl, config.chainId])
  const [user, setUser] = useState<SessionUser | null>(null)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useMemo(
    () => async () => {
      const me = await client.api.me()
      setUser(me)
      if (!me) {
        setWallet(null)
        return
      }
      let w = await client.api.getWallet()
      if (!w) w = await client.api.provisionWallet()
      setWallet({
        address: w.address,
        createdAt: w.createdAt,
        provenance: w.provenance,
      })
    },
    [client],
  )

  useEffect(() => {
    let cancelled = false
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const value = useMemo<SpacyContextValue>(
    () => ({
      client,
      user,
      wallet,
      ready,
      refresh,
      login: () => {
        window.location.href = client.loginUrl()
      },
      logout: async () => {
        await client.api.logout()
        setUser(null)
        setWallet(null)
      },
    }),
    [client, user, wallet, ready, refresh],
  )

  return <SpacyContext.Provider value={value}>{children}</SpacyContext.Provider>
}

export function useSpacy(): SpacyContextValue {
  const ctx = useContext(SpacyContext)
  if (!ctx) throw new Error('useSpacy must be used inside <SpacyProvider>')
  return ctx
}
