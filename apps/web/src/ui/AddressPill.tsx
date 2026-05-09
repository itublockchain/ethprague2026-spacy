import type { Hex } from '@spacy/types'
import { useState } from 'react'

interface AddressPillProps {
  address: Hex
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function AddressPill({ address }: AddressPillProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 800)
    } catch (err) {
      console.error('clipboard write failed', err)
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void onCopy()
      }}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      className={`inline-flex cursor-pointer items-center rounded-sm border border-dusk/30 px-3 py-1.5 text-[12px] tracking-[0.02em] text-starlight transition-colors duration-200 hover:border-dusk/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost ${
        copied ? 'bg-aurora/20' : 'bg-cosmos'
      }`}
    >
      {copied ? 'Copied' : truncate(address)}
    </button>
  )
}
