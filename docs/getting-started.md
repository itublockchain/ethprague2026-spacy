---
description: Install @spacy/sdk and wire SpacyProvider into a React app in five minutes.
---

# Getting started

## 1. Install

```bash
# pnpm
pnpm add @spacy/sdk viem react

# bun
bun add @spacy/sdk viem react

# npm
npm install @spacy/sdk viem react
```

`viem` and `react` are peer dependencies. The SDK does not bundle them.

## 2. Wrap your app in `SpacyProvider`

The provider creates a `SpacyClient`, fetches the current session on mount, auto-provisions a wallet for first-time users, and re-renders everything underneath when state changes.

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

Pass a **stable** config object — defining it at module scope (as above) is the right pattern. The provider rebuilds the client when `apiBaseUrl` or `chainId` changes; if you reconstruct the config object on every render, you'll thrash the client.

See [SpacyProvider reference](reference/spacy-provider.md) for every option.

## 3. Render a sign-in button

```tsx
// src/App.tsx
import { useWallet } from '@spacy/sdk'

export function App() {
  const { user, wallet, ready, login, logout } = useWallet()

  if (!ready) return <p>Loading…</p>

  if (!user) {
    return <button onClick={login}>Sign in with Google</button>
  }

  return (
    <>
      <p>Hi, {user.name ?? user.email}</p>
      <p>Wallet: <code>{wallet?.address}</code></p>
      <button onClick={logout}>Sign out</button>
    </>
  )
}
```

`login()` performs a full-page redirect to Google's OAuth screen via the Spacy backend. After consent, the user lands back in your app with an `httpOnly` session cookie set on the Spacy API origin. `useWallet()` then reports `user` and `wallet`, and the wallet is auto-provisioned on first sign-in (one Orbitport KMS key per user, Ethereum address returned).

## 4. Send a transaction

```tsx
import { useWallet, useSign } from '@spacy/sdk'

export function SendButton() {
  const { wallet } = useWallet()
  const { signAndSend, pending } = useSign()

  if (!wallet) return null

  const onClick = async () => {
    const { txHash, attestationSlug } = await signAndSend({
      to: '0x000000000000000000000000000000000000dEaD',
      value: '0.01', // ETH, parsed by the SDK
    })
    window.open(`https://spacy.computer/proof/${attestationSlug}`)
  }

  return (
    <button disabled={pending} onClick={onClick}>
      {pending ? 'Signing…' : 'Send 0.01 ETH'}
    </button>
  )
}
```

Behind that one call, the SDK reads `nonce` and EIP-1559 fees from the public RPC, builds the unsigned transaction, asks the backend (inside an attested SEV-SNP TEE) to sign the keccak256 digest using the user's KMS key (inside Intel TDX), splices the returned signature back into the transaction, broadcasts to the configured chain, and returns the broadcast `txHash` plus the proof slug.

## 5. Cross-origin cookie checklist

Spacy's session cookie is `httpOnly`, `Secure`, `SameSite=None`, scoped to the API origin. For your frontend to send it on requests to the Spacy API, **both** of these must be true:

* You're on **HTTPS** (in production this is automatic; in local dev see [the FAQ](notes/faq.md#local-development)).
* Your origin is in the API's CORS allow-list. For the hosted Spacy API, that means your domain must be registered. Email **support@spacy.computer** to add an origin.

The SDK calls `fetch(..., { credentials: 'include' })` for you. You don't need to configure anything in your app.

## What's next?

* **[How it works →](how-it-works.md)** — the trust chain, end-to-end flow, why the browser never sees a private key.
* **[Reference →](reference/spacy-provider.md)** — every prop, hook return, type.
* **[Recipes →](recipes/sign-in.md)** — copy-paste examples for common patterns.
