import { useSendTransaction } from '@privy-io/react-auth'
import type { Hex, SendState } from '@spacy/types'
import { useCallback, useState } from 'react'
import { parseEther } from 'viem'
import { SEPOLIA_CHAIN_ID } from '../lib/constants'
import { publicClient } from '../lib/viem'

interface UseSendOrbitalArgs {
  to: Hex
  amountEth: string
}

interface UseSendOrbitalResult {
  state: SendState
  send: () => void
  reset: () => void
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Visual phase durations are demo theatre, not real signing latency.
// Real Privy signing happens in parallel; we just stage the UI on top of it.
const ORBITAL_DELAY_MS = 600
const ORBITAL_PHASE_MS = 1200
const GROUND_PHASE_MS = 1200

export function useSendOrbital({ to, amountEth }: UseSendOrbitalArgs): UseSendOrbitalResult {
  const [state, setState] = useState<SendState>({ status: 'idle' })
  const { sendTransaction } = useSendTransaction()

  const run = useCallback(async () => {
    setState({ status: 'authorizing' })

    const txPromise: Promise<{ hash: Hex } | { __error: unknown }> = sendTransaction({
      to,
      value: parseEther(amountEth),
      chainId: SEPOLIA_CHAIN_ID,
    })
      .then((res) => ({ hash: (res as { hash: Hex }).hash }))
      .catch((err: unknown) => ({ __error: err }))

    await sleep(ORBITAL_DELAY_MS)
    setState({ status: 'orbital-signing' })
    await sleep(ORBITAL_PHASE_MS)
    setState({ status: 'ground-signing' })
    await sleep(GROUND_PHASE_MS)

    const result = await txPromise
    if ('__error' in result) {
      const err = result.__error
      setState({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Transaction failed',
      })
      return
    }

    setState({ status: 'broadcasting' })

    try {
      await publicClient.waitForTransactionReceipt({ hash: result.hash })
      setState({ status: 'confirmed', hash: result.hash })
    } catch (err) {
      setState({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Confirmation failed',
      })
    }
  }, [sendTransaction, to, amountEth])

  const send = useCallback(() => {
    void run()
  }, [run])

  const reset = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  return { state, send, reset }
}
