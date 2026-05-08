import type { Hex, SendState } from '@spacy/types'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { DEMO_AMOUNT_ETH, DEMO_RECIPIENT } from '../lib/constants'
import { AddressPill } from './AddressPill'
import { SendButton } from './SendButton'

interface TransactionCardProps {
  walletAddress: Hex
  balance: string | null
  refreshing: boolean
  state: SendState
  onSend: () => void
}

function truncateAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function formatBalance(b: string | null) {
  if (b === null) return '—'
  const num = Number(b)
  return num.toFixed(4)
}

export function TransactionCard({
  walletAddress,
  balance,
  refreshing,
  state,
  onSend,
}: TransactionCardProps) {
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    if (refreshing) {
      gsap.fromTo(el, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.6, ease: 'power2.out' })
    } else {
      gsap.to(el, { opacity: 0, duration: 0.4 })
    }
  }, [refreshing])

  const errorMessage = state.status === 'failed' ? state.error : null

  return (
    <div className="relative w-full max-w-[720px] overflow-hidden rounded-lg border border-dusk/15 bg-slate p-6">
      <div
        ref={stripRef}
        className="absolute top-0 right-0 left-0 h-px origin-left bg-aurora opacity-0"
      />
      <div className="flex flex-col gap-y-5">
        <div className="flex items-center justify-between">
          <AddressPill address={walletAddress} />
          <div
            style={{ fontVariantNumeric: 'tabular-nums' }}
            className="text-[14px] text-starlight"
          >
            {formatBalance(balance)} <span className="text-dusk">ETH</span>
          </div>
        </div>

        <div className="flex flex-col gap-y-1">
          <div className="text-[12px] tracking-[0.02em] text-dusk">to</div>
          <div
            style={{ fontVariantNumeric: 'tabular-nums' }}
            className="text-[24px] font-medium text-starlight"
          >
            {DEMO_AMOUNT_ETH} ETH
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }} className="text-[14px] text-dusk">
            {truncateAddress(DEMO_RECIPIENT)}
          </div>
        </div>

        <SendButton state={state} onSend={onSend} />

        {errorMessage ? <div className="text-[14px] text-terracotta">{errorMessage}</div> : null}
      </div>
    </div>
  )
}
