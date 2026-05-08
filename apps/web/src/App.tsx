import { useSign, useWallet } from '@spacy/sdk'
import { useState } from 'react'
import type { Hex } from 'viem'

export function App() {
  const { user, wallet, ready, login, logout } = useWallet()
  const { signAndSend, pending, error, lastResult } = useSign()
  const [to, setTo] = useState<string>('')

  if (!ready) return <main>Loading…</main>

  if (!user) {
    return (
      <main>
        <h1>Spacy</h1>
        <button type="button" onClick={login}>
          Sign in with Google
        </button>
      </main>
    )
  }

  return (
    <main>
      <header>
        <span>{user.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      {wallet ? (
        <section>
          <h2>Wallet</h2>
          <code>{wallet.address}</code>

          <h3>Send 0.001 ETH</h3>
          <input placeholder="0x… recipient" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            type="button"
            disabled={pending || !to.startsWith('0x')}
            onClick={async () => {
              await signAndSend({ to: to as Hex, value: '0.001' })
            }}
          >
            {pending ? 'Signing in orbit…' : 'Sign & send'}
          </button>

          {error && <p style={{ color: 'crimson' }}>{error.message}</p>}
          {lastResult && (
            <p>
              tx: <code>{lastResult.txHash}</code>
              <br />
              proof:{' '}
              <a href={`/proof/${lastResult.attestationSlug}`}>{lastResult.attestationSlug}</a>
            </p>
          )}
        </section>
      ) : (
        <p>Provisioning wallet…</p>
      )}
    </main>
  )
}
