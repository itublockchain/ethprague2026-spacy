---
description: Sign in with Google and surface the user's wallet address.
---

# Sign in and provision a wallet

A complete, copy-pasteable example: sign-in button, loading state, signed-in dashboard with wallet address, sign-out.

```tsx
// src/App.tsx
import { useWallet } from '@spacy/sdk'

export function App() {
  const { user, wallet, ready, login, logout } = useWallet()

  if (!ready) {
    return <p>Loading…</p>
  }

  if (!user) {
    return (
      <main>
        <h1>Spacy demo</h1>
        <button onClick={login}>Sign in with Google</button>
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Hi, {user.name ?? user.email}</h1>
        <button onClick={logout}>Sign out</button>
      </header>

      {wallet ? (
        <section>
          <h2>Your wallet</h2>
          <code>{wallet.address}</code>
          <p>
            Provisioned at {new Date(wallet.createdAt).toLocaleString()} with
            entropy from <strong>{wallet.provenance.satelliteSource}</strong>.
          </p>
        </section>
      ) : (
        <p>Provisioning your wallet…</p>
      )}
    </main>
  )
}
```

```tsx
// src/main.tsx
import { SpacyProvider } from '@spacy/sdk'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const config = {
  apiBaseUrl: 'https://api.spacy.computer',
  chainId: 11155111, // Sepolia
}

createRoot(document.getElementById('root')!).render(
  <SpacyProvider config={config}>
    <App />
  </SpacyProvider>,
)
```

## What happens, step by step

1. **First render, before the session check completes.** `ready` is `false`. Show a loading state. Skipping this branch causes a flash of "sign in" UI to users who are already signed in.
2. **Session check resolves, no user.** `user` is `null`. Render the sign-in button.
3. **User clicks "Sign in with Google".** `login()` does `window.location.href = ...`. The browser leaves the page entirely and lands on Google's OAuth screen, then on Spacy's `/auth/google/callback`, which sets the session cookie and redirects back to your app.
4. **Page reloads, signed in.** `useWallet()` fetches `user` (✓), then `wallet`. If the user has never used Spacy before, the SDK auto-calls `POST /wallet/provision`, which kicks off the cosmic-entropy fetch and the Orbitport KMS key creation. This typically settles in under 2 seconds.
5. **Wallet appears.** `wallet.address` is the user's Ethereum address. From here, calling `useSign()` is unblocked.

## Notes

* The cookie is set on the **API origin** (`apiBaseUrl`), not your app origin. Your app reads the session indirectly by hitting the API with `credentials: 'include'` (handled by the SDK).
* `login()` is a redirect. Anything in component-local state is lost across the OAuth round-trip. Persist to `sessionStorage` first if you need to survive it.
* On sign-out, the session cookie is cleared and local state resets. The user is **not** redirected anywhere; you decide where to send them.

## Next

* [Send a transaction](send-transaction.md) — sign and broadcast.
* [Render a proof page](proof-page.md) — surface the receipt.
