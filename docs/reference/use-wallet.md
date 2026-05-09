---
description: API reference for the useWallet hook — current user, wallet, and auth actions.
---

# `useWallet`

Returns the current user, the current wallet, and the actions to sign in, sign out, and re-sync.

```ts
import { useWallet } from '@spacy/sdk'

function useWallet(): UseWallet

interface UseWallet {
  user: SessionUser | null
  wallet: WalletInfo | null
  ready: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
```

This is a thin selector over `useSpacy()` — it returns the same five values. Reach for it when a component only needs the auth/wallet surface.

## Returns

| Field | Type | Notes |
|---|---|---|
| `user` | `SessionUser \| null` | `null` until signed in or after `logout()`. |
| `wallet` | `WalletInfo \| null` | `null` until the provider finishes auto-provisioning. |
| `ready` | `boolean` | `true` once the provider's initial fetch settled. Use it to avoid flashing a sign-in button to an already-signed-in user. |
| `login` | `() => void` | Full-page redirects to the Spacy backend's Google OAuth start URL. Returns nothing — control leaves the page. |
| `logout` | `() => Promise<void>` | Calls `POST /auth/logout`, then clears local `user` and `wallet`. Resolves when both finish. |
| `refresh` | `() => Promise<void>` | Re-runs the on-mount fetch cycle. Useful after the user signs in in another tab. |

## Types

```ts
interface SessionUser {
  id: string       // uuid
  email: string
  name: string | null
}

interface WalletInfo {
  address: `0x${string}`
  createdAt: string  // ISO 8601
  provenance: {
    entropyHash: string
    entropySig: string
    satelliteSource: string  // e.g. "aptosorbital"
  }
}
```

`provenance` is the cosmic-randomness witness captured when the wallet was provisioned. It does not change after creation. The signing-time entropy witness is separate and lives on each [proof payload](use-attestation.md).

## Common patterns

### Show a loading state while the session is being checked

```tsx
const { ready, user, login } = useWallet()

if (!ready) return <Spinner />
if (!user) return <button onClick={login}>Sign in with Google</button>
return <Dashboard />
```

### Display the wallet address with a fallback

```tsx
const { wallet } = useWallet()

return (
  <code>
    {wallet ? truncate(wallet.address) : 'Provisioning…'}
  </code>
)
```

`wallet` will be non-null within ~1 second of the user's first sign-in. If you see persistent `null`, check the network tab for `POST /wallet/provision` failures.

### Refresh after an external sign-in

```tsx
const { refresh } = useWallet()

useEffect(() => {
  const onFocus = () => { refresh() }
  window.addEventListener('focus', onFocus)
  return () => window.removeEventListener('focus', onFocus)
}, [refresh])
```

The SDK does not do this automatically; opt in only if your UX expects it.

## Behaviour notes

* `login()` is a **redirect**, not a popup. The user leaves your app and lands back on it after the OAuth flow with the session cookie set on `apiBaseUrl`. Anything in component-local state will be lost across the redirect — persist before calling `login()` if you need it.
* `logout()` clears state on success. If the network request fails, local state is still cleared in the provider's optimistic path, but you may want to wrap it in your own try/catch to surface the error.
* `refresh()` does not reject on 401. A 401 simply produces `user: null`, which is the correct state.

## See also

* [`SpacyProvider`](spacy-provider.md) — owns the underlying state.
* [`useSign`](use-sign.md) — needs `wallet` to be non-null before calling.
