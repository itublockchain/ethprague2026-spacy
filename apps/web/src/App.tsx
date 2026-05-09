// Open decisions — see frontend guide section 14:
// - Wordmark text confirmed as `spacy` (lowercase)
// - Hook copy placeholder: "Signed above the atmosphere."
// - Demo recipient: 0x000…dEaD on Sepolia (override in lib/constants.ts)
// - Demo amount: 0.05 ETH (override in lib/constants.ts)
import { useSpacyAuth } from './hooks/useSpacyAuth'
import { Landing } from './screens/Landing'
import { Wallet } from './screens/Wallet'

export function App() {
  const { ready, authenticated } = useSpacyAuth()

  if (!ready) {
    return <div className="min-h-screen w-full" />
  }

  return authenticated ? <Wallet /> : <Landing />
}
