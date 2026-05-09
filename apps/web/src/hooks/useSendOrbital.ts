import { type Hex, type SendState, useSign } from '@spacy-computer/sdk'
import { useCallback, useEffect, useState } from 'react'
import { parseEther } from 'viem'
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

// Visual phase durations are demo theatre layered on top of real signing.
// The KMS round-trip happens during the `ground-signing` phase; the orbital
// pre-roll just gives the UI room to breathe so the animation reads.
const ORBITAL_DELAY_MS = 600
const ORBITAL_PHASE_MS = 1200
const GROUND_PHASE_MIN_MS = 1200
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
  const { signAndSend } = useSign()

  const run = useCallback(async () => {
    setState({ status: 'authorizing' })

    let txHash: Hex | null = null
    let attestationSlug: string | undefined
    let txError: string | null = null

    // Kick off the real signing flow immediately so the network round-trip
    // overlaps with the orbital animation. Promise is awaited later.
    const txPromise = signAndSend({ to, value: parseEther(amountEth) })
      .then((res) => {
        txHash = res.txHash
        attestationSlug = res.attestationSlug
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
    await Promise.all([txPromise, sleep(GROUND_PHASE_MIN_MS)])
    if (failEarly()) return

    if (!txHash) {
      setState({ status: 'failed', error: 'Transaction failed.' })
      return
    }

    setState({ status: 'broadcasting' })
    try {
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      setState({
        status: 'confirmed',
        hash: txHash,
        ...(attestationSlug ? { attestationSlug } : {}),
      })
    } catch (err) {
      setState({ status: 'failed', error: humanizeError(err) })
    }
  }, [signAndSend, to, amountEth])

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
