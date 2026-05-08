import { useSendTransaction } from '@privy-io/react-auth'
import type { Hex, SendState } from '@spacy/types'
import { useCallback, useEffect, useState } from 'react'
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
const CONFIRMED_HOLD_MS = 30000

function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const msg = raw.toLowerCase()
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
    return 'Not enough Sepolia ETH. Add funds to your wallet and try again.'
  }
  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('cancelled')) {
    return 'Transaction was cancelled.'
  }
  if (msg.includes('nonce')) {
    return 'Wallet nonce mismatch. Refresh and try again.'
  }
  if (msg.includes('intrinsic gas') || msg.includes('gas required exceeds')) {
    return 'Gas limit too low. Try again in a moment.'
  }
  if (msg.includes('replacement transaction underpriced')) {
    return 'A pending tx already exists. Wait for it to finish or refresh.'
  }
  return raw.length > 200 ? `${raw.slice(0, 197)}…` : raw || 'Transaction failed.'
}

export function useSendOrbital({ to, amountEth }: UseSendOrbitalArgs): UseSendOrbitalResult {
  const [state, setState] = useState<SendState>({ status: 'idle' })
  const { sendTransaction } = useSendTransaction()

  const run = useCallback(async () => {
    setState({ status: 'authorizing' })

    let txHash: Hex | null = null
    let txError: string | null = null

    const txPromise = sendTransaction({
      to,
      value: parseEther(amountEth),
      chainId: SEPOLIA_CHAIN_ID,
    })
      .then((res) => {
        txHash = (res as { hash: Hex }).hash
      })
      .catch((err: unknown) => {
        txError = humanizeError(err)
      })

    const failEarly = () => {
      if (txError !== null) {
        setState({ status: 'failed', error: txError })
        return true
      }
      return false
    }

    await sleep(ORBITAL_DELAY_MS)
    if (failEarly()) return

    setState({ status: 'orbital-signing' })
    await sleep(ORBITAL_PHASE_MS)
    if (failEarly()) return

    setState({ status: 'ground-signing' })
    await sleep(GROUND_PHASE_MS)
    await txPromise
    if (failEarly()) return

    if (!txHash) {
      setState({ status: 'failed', error: 'Transaction failed.' })
      return
    }

    setState({ status: 'broadcasting' })
    try {
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      setState({ status: 'confirmed', hash: txHash })
    } catch (err) {
      setState({ status: 'failed', error: humanizeError(err) })
    }
  }, [sendTransaction, to, amountEth])

  const send = useCallback(() => {
    void run()
  }, [run])

  const reset = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  useEffect(() => {
    if (state.status !== 'confirmed') return
    const t = setTimeout(() => setState({ status: 'idle' }), CONFIRMED_HOLD_MS)
    return () => clearTimeout(t)
  }, [state.status])

  return { state, send, reset }
}
