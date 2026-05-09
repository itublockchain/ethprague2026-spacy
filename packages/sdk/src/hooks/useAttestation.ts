import type { ProofPayload } from '@spacy/shared/schemas'
import { useEffect, useState } from 'react'
import { useSpacy } from '../provider'

export interface UseAttestation {
  proof: ProofPayload | null
  loading: boolean
  error: Error | null
}

export function useAttestation(slug: string | null | undefined): UseAttestation {
  const { client } = useSpacy()
  const [proof, setProof] = useState<ProofPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        setLoading(true)
        const next = await client.api.getProof(slug)
        if (cancelled) return
        setProof(next)
        setError(null)
        const terminal =
          next.status === 'complete' ||
          next.status === 'pin_failed' ||
          next.status === 'onchain_failed'
        if (!terminal) {
          timer = setTimeout(tick, 4_000)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [client, slug])

  return { proof, loading, error }
}
