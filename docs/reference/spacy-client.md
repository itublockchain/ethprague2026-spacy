---
description: Imperative API reference for the SpacyClient class.
---

# `SpacyClient` (advanced)

`SpacyClient` is the imperative class behind `<SpacyProvider>` and the hooks. Use it when:

* You're not in a React app.
* You need to call the API outside of a component (background worker, Node script, test).
* You're building a custom abstraction on top of the SDK.

```ts
import { SpacyClient } from '@spacy-computer/sdk'

const client = new SpacyClient({
  apiBaseUrl: 'https://api.spacy.computer',
  chainId: 11155111,
  rpcUrl: 'https://my-rpc.example.com',
})
```

## Constructor

```ts
new SpacyClient(config: SpacyClientConfig)

interface SpacyClientConfig {
  apiBaseUrl: string
  chainId: number
  rpcUrl?: string
}
```

The constructor strips trailing slashes from `apiBaseUrl` and builds an internal `viem` `PublicClient` for the chain.

## Members

### `client.api`

The underlying `SpacyApi` instance. Exposes:

```ts
client.api.me():           Promise<SessionUser | null>
client.api.logout():       Promise<void>
client.api.provisionWallet(): Promise<WalletMeResponse>
client.api.getWallet():    Promise<WalletMeResponse | null>
client.api.signDigest(req: SignDigestRequest): Promise<SignDigestResponse>
client.api.getProof(slug: string): Promise<ProofPayload>
client.api.loginUrl():     string
```

Every method calls the corresponding HTTP endpoint with `credentials: 'include'`. Throws `SpacyApiError` (an internal class — catch as generic `Error`) on non-2xx responses, except where noted: `me()` and `getWallet()` map 401/404 to `null`.

### `client.publicClient`

The raw `viem` `PublicClient`. Use it for direct chain reads — gas estimates, contract reads, log queries — without round-tripping through `signAndSend`.

```ts
const balance = await client.publicClient.getBalance({ address: wallet.address })
```

### `client.chainId`

```ts
client.chainId: number
```

The chain id the client was constructed with.

### `client.loginUrl()`

```ts
client.loginUrl(): string
```

Returns the absolute Google OAuth start URL. In the React provider, `login()` does `window.location.href = client.loginUrl()`. Use this directly if you're rendering a server-side anchor or building a custom redirect flow.

### `client.signAndSend()`

```ts
client.signAndSend(req: SignRequest, wallet: WalletInfo): Promise<SignResult>

interface SignRequest {
  to: `0x${string}`
  value?: bigint | string
  data?: `0x${string}`
  gas?: bigint
}

interface SignResult {
  txHash: `0x${string}`
  attestationSlug: string
}
```

Identical behaviour to [`useSign().signAndSend`](use-sign.md), but you must pass `wallet` explicitly. The hook reads `wallet` from context for you.

```ts
const wallet = await client.api.getWallet()
if (!wallet) throw new Error('no wallet')

const { txHash, attestationSlug } = await client.signAndSend(
  { to: '0x...', value: '0.01' },
  { address: wallet.address, createdAt: wallet.createdAt, provenance: wallet.provenance },
)
```

## Examples

### Use the SDK in a Node script

```ts
import { SpacyClient } from '@spacy-computer/sdk'

const client = new SpacyClient({
  apiBaseUrl: 'https://api.spacy.computer',
  chainId: 11155111,
})

const me = await client.api.me()
if (!me) {
  console.log('Open this URL to sign in:', client.loginUrl())
  process.exit(1)
}
```

Browser-side cookie auth doesn't transfer to Node — for server-side use you'd need a service-to-service auth scheme that the public Spacy API doesn't currently expose. This is purely illustrative.

### Use the imperative API alongside the React provider

The provider exposes `client` via `useSpacy()`. You can call any imperative method without breaking the provider's tracked state, as long as you don't shadow it:

```tsx
const { client, refresh } = useSpacy()

const onCustomAction = async () => {
  await client.api.logout()
  await refresh()  // sync provider state
}
```

## See also

* [`SpacyProvider`](spacy-provider.md) — the React wrapper around this class.
* [Types](types.md) — every type re-exported from `@spacy-computer/sdk`.
