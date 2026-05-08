import type { SendState } from '@spacy/types'
import { AnimatePresence, motion } from 'motion/react'
import { DEMO_AMOUNT_ETH, SEPOLIA_EXPLORER } from '../lib/constants'

interface SendButtonProps {
  state: SendState
  onSend: () => void
}

const phaseLabel: Record<Exclude<SendState['status'], 'confirmed'>, string> = {
  idle: `Send ${DEMO_AMOUNT_ETH} ETH`,
  authorizing: 'Authorizing',
  'orbital-signing': 'Signing in orbit',
  'ground-signing': 'Signing on ground',
  broadcasting: 'Broadcasting',
  failed: 'Try again',
}

function truncateHash(h: string) {
  return `${h.slice(0, 6)}…${h.slice(-4)}`
}

export function SendButton({ state, onSend }: SendButtonProps) {
  if (state.status === 'confirmed') {
    return (
      <a
        href={`${SEPOLIA_EXPLORER}/tx/${state.hash}`}
        target="_blank"
        rel="noreferrer"
        className="block w-full rounded-md bg-aurora py-3 text-center text-[14px] font-medium text-cosmos transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
      >
        View tx {truncateHash(state.hash)} ↗
      </a>
    )
  }

  const isWorking =
    state.status === 'authorizing' ||
    state.status === 'orbital-signing' ||
    state.status === 'ground-signing' ||
    state.status === 'broadcasting'
  const isFailed = state.status === 'failed'

  const stateClasses = isWorking
    ? 'bg-slate border border-amber/40 text-amber'
    : isFailed
      ? 'bg-transparent border border-terracotta text-terracotta hover:bg-terracotta/10'
      : 'bg-amber text-cosmos hover:opacity-90'

  return (
    <motion.button
      type="button"
      onClick={onSend}
      disabled={isWorking}
      animate={isFailed ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      aria-live="polite"
      className={`w-full rounded-md py-3 text-[14px] font-medium transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost disabled:cursor-default ${stateClasses}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state.status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="block"
        >
          {phaseLabel[state.status]}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
