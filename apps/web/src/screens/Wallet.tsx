import { useSendOrbital } from '../hooks/useSendOrbital'
import { useSepoliaBalance } from '../hooks/useSepoliaBalance'
import { useSpacyAuth } from '../hooks/useSpacyAuth'
import { DEMO_AMOUNT_ETH, DEMO_RECIPIENT } from '../lib/constants'
import { WalletScene } from '../scenes/WalletScene'
import { TransactionCard } from '../ui/TransactionCard'
import { Wordmark } from '../ui/Wordmark'

export function Wallet() {
  const { walletAddress } = useSpacyAuth()
  const { balance, refreshing } = useSepoliaBalance(walletAddress)
  const { state, send } = useSendOrbital({
    to: DEMO_RECIPIENT,
    amountEth: DEMO_AMOUNT_ETH,
  })

  if (!walletAddress) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-dusk">
        Connecting wallet…
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="absolute top-6 right-0 left-0 z-10 flex justify-center">
        <Wordmark />
      </header>

      <div className="flex flex-1 flex-col items-center pt-20">
        <WalletScene state={state} />
        <div className="relative z-10 -mt-16 flex w-full justify-center px-6">
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
