import { motion } from 'motion/react'
import { useSendOrbital } from '../hooks/useSendOrbital'
import { useSepoliaBalance } from '../hooks/useSepoliaBalance'
import { useSpacyAuth } from '../hooks/useSpacyAuth'
import { DEMO_AMOUNT_ETH, DEMO_RECIPIENT } from '../lib/constants'
import { WalletScene } from '../scenes/WalletScene'
import { TransactionCard } from '../ui/TransactionCard'

export function Wallet() {
  const { walletAddress, signOut } = useSpacyAuth()
  const { balance, refreshing } = useSepoliaBalance(walletAddress)
  const { state, send } = useSendOrbital({
    to: DEMO_RECIPIENT,
    amountEth: DEMO_AMOUNT_ETH,
  })

  if (!walletAddress) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-y-5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-amber"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <div className="text-center text-[16px] text-starlight">
            Provisioning your spacy wallet
          </div>
          <div className="max-w-[360px] text-center text-[12px] text-dusk">
            Spinning up an embedded wallet across orbital and ground signers. This usually takes a
            few seconds.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <button
        type="button"
        onClick={signOut}
        className="absolute top-6 right-6 z-20 cursor-pointer text-[12px] tracking-[0.02em] text-dusk transition-colors duration-200 hover:text-starlight focus-visible:text-starlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
      >
        Sign out
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-y-10 px-6 pt-24 pb-12">
        <WalletScene state={state} />
        <div className="relative z-10 flex w-full justify-center">
          <TransactionCard
            walletAddress={walletAddress}
            balance={balance}
            refreshing={refreshing}
            state={state}
            onSend={send}
          />
        </div>
      </div>
    </div>
  )
}
