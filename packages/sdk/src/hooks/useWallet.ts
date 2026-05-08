import type { SessionUser } from '@spacy/shared/schemas'
import type { WalletInfo } from '../client'
import { useSpacy } from '../provider'

export interface UseWallet {
  user: SessionUser | null
  wallet: WalletInfo | null
  ready: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export function useWallet(): UseWallet {
  const { user, wallet, ready, login, logout, refresh } = useSpacy()
  return { user, wallet, ready, login, logout, refresh }
}
