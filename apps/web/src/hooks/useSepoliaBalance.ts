import type { Hex } from '@spacy-computer/sdk'
import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { publicClient } from '../lib/viem'

interface BalanceResult {
  balance: string | null
  refreshing: boolean
}

const POLL_INTERVAL_MS = 8000

export function useSepoliaBalance(address: Hex | null): BalanceResult {
  const [balance, setBalance] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!address) {
      setBalance(null)
      return
    }

    let cancelled = false

    const fetchBalance = async () => {
      setRefreshing(true)
      try {
        const wei = await publicClient.getBalance({ address })
        if (!cancelled) setBalance(formatEther(wei))
      } catch (err) {
        console.error('balance fetch failed', err)
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    }

    void fetchBalance()
    const interval = setInterval(() => {
      void fetchBalance()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [address])

  return { balance, refreshing }
}
