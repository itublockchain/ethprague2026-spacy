---
description: API reference for <SpacyProvider> and the useSpacy() hook.
---

# `SpacyProvider`

The React provider that owns the SDK's session and wallet state. Wrap it once at the top of your component tree.

```tsx
import { SpacyProvider } from '@spacy/sdk'

<SpacyProvider config={{ apiBaseUrl, chainId, rpcUrl }}>
  <App />
</SpacyProvider>
```

## Props

```ts
interface SpacyProviderProps {
  config: SpacyClientConfig
  children: ReactNode
}

interface SpacyClientConfig {
  apiBaseUrl: string  // e.g. "https://api.spacy.computer"
  chainId: number     // e.g. 11155111 for Sepolia
  rpcUrl?: string     // optional override; defaults to viem's public RPC for the chain
}
```

| Field | Required | Notes |
|---|---|---|
| `config.apiBaseUrl` | yes | The Spacy API origin. Trailing slashes are stripped. |
| `config.chainId` | yes | Determines which chain `signAndSend` builds and broadcasts to. |
| `config.rpcUrl` | no | Override the default RPC. Use a paid RPC for production-grade availability. |

### Stability of `config`

The provider memoizes the `SpacyClient` based on `config.apiBaseUrl` and `config.chainId`. Changing either rebuilds the client. **Do not** allocate the config object inline on every render — define it at module scope or memoize it. The deep dependency tracking is intentionally narrow (only those two fields), so a new object identity with the same values is fine, but unstable values for those two fields will thrash.

## What it does on mount

1. Constructs a `SpacyClient`.
2. Calls `client.api.me()` to discover whether the user is already signed in.
3. If signed in: calls `client.api.getWallet()`. If 404, calls `client.api.provisionWallet()` to create one (idempotent on the backend).
4. Sets `ready: true` once the initial cycle settles, regardless of success.

The provider does **not** automatically refresh on focus, on interval, or on storage events. Call `refresh()` manually if your app needs to re-sync after some external event (e.g., the user signed in in another tab).

## `useSpacy()`

Low-level access to the full context. Most consumers should use `useWallet()`, `useSign()`, and `useAttestation()` instead.

```ts
function useSpacy(): SpacyContextValue

interface SpacyContextValue {
  client: SpacyClient                  // imperative API
  user: SessionUser | null             // signed-in user, null otherwise
  wallet: WalletInfo | null            // user's wallet, null until provisioned
  ready: boolean                       // initial fetch completed
  refresh: () => Promise<void>         // re-fetch user + wallet
  login: () => void                    // window.location.href → /auth/google
  logout: () => Promise<void>          // POST /auth/logout, clears local state
}
```

Throws `Error('useSpacy must be used inside <SpacyProvider>')` if called outside the provider.

## When to reach for `useSpacy()` instead of the named hooks

* You need the imperative `client` to make a one-off API call the hooks don't expose.
* You're writing a non-trivial wrapper component that needs the full context in one read.
* You're building higher-level abstractions on top of the SDK.

For everyday use, prefer the typed hooks — they're stable contracts. `useSpacy()` is intentionally a wider surface and may grow over time.

## Example: gating an entire app

```tsx
import { SpacyProvider, useWallet } from '@spacy/sdk'

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, user, login } = useWallet()
  if (!ready) return null
  if (!user) return <button onClick={login}>Sign in with Google</button>
  return <>{children}</>
}

export function Root() {
  return (
    <SpacyProvider config={CONFIG}>
      <Gate>
        <App />
      </Gate>
    </SpacyProvider>
  )
}
```

## See also

* [`useWallet`](use-wallet.md) — narrow accessor for `user`, `wallet`, and the auth actions.
* [`SpacyClient`](spacy-client.md) — the imperative class behind the provider.
