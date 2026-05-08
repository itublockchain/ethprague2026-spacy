import { useCallback, useState } from 'react'
import type { SignRequest, SignResult } from '../client'
import { useSpacy } from '../provider'

export interface UseSign {
  signAndSend: (req: SignRequest) => Promise<SignResult>
  pending: boolean
  error: Error | null
  lastResult: SignResult | null
}

export function useSign(): UseSign {
  const { client, wallet } = useSpacy()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastResult, setLastResult] = useState<SignResult | null>(null)

  const signAndSend = useCallback(
    async (req: SignRequest) => {
      if (!wallet) throw new Error('wallet_not_ready')
      setPending(true)
      setError(null)
      try {
        const result = await client.signAndSend(req, wallet)
        setLastResult(result)
        return result
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e)
        throw e
      } finally {
        setPending(false)
      }
    },
    [client, wallet],
  )

  return { signAndSend, pending, error, lastResult }
}
