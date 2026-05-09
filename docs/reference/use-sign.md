---
description: API reference for the useSign hook — sign and broadcast EIP-1559 transactions.
---

# `useSign`

Builds, signs (via the attested backend), and broadcasts a transaction in one call.

```ts
import { useSign } from '@spacy/sdk'

function useSign(): UseSign

interface UseSign {
  signAndSend: (req: SignRequest) => Promise<SignResult>
  pending: boolean
  error: Error | null
  lastResult: SignResult | null
}
```

## Request

```ts
interface SignRequest {
  to: `0x${string}`
  value?: bigint | string  // optional; default 0n. String is parsed with viem's parseEther
  data?: `0x${string}`     // optional; default "0x"
  gas?: bigint             // optional; default 21_000n
}
```

| Field | Default | Notes |
|---|---|---|
| `to` | required | The recipient address. EIP-1559 transactions must have a non-null `to`. |
| `value` | `0n` | Pass a `bigint` in wei, or a string like `"0.01"` (interpreted as ETH). |
| `data` | `"0x"` | Calldata. Use `viem`'s `encodeFunctionData()` for contract calls. |
| `gas` | `21_000n` | Override for contract calls. Pass enough or the broadcast will fail. |

The SDK fetches `nonce` and EIP-1559 fee parameters automatically from the configured RPC; you cannot override them in this version.

## Result

```ts
interface SignResult {
  txHash: `0x${string}`     // chain transaction hash returned by sendRawTransaction
  attestationSlug: string   // opaque slug for the proof page
}
```

* `txHash` — the transaction hash of the broadcast. Identical to what a wallet would surface.
* `attestationSlug` — pass to `useAttestation(slug)` to render proof status, or build a URL like `https://spacy.computer/proof/${attestationSlug}`.

## State

| Field | Type | Notes |
|---|---|---|
| `pending` | `boolean` | `true` from the moment `signAndSend` is invoked until it resolves or rejects. |
| `error` | `Error \| null` | Set when `signAndSend` rejects. Cleared on the next invocation. |
| `lastResult` | `SignResult \| null` | The most recent successful result. Survives unmount/remount only if the hook instance does. |

`signAndSend` both **returns** the result and **throws** on error, so you can use either return-value or imperative-state patterns. The hook also tracks both for you.

## Preconditions

`signAndSend` rejects with `Error('wallet_not_ready')` if `wallet` is `null` at call time. Always gate the call site on `useWallet().wallet`:

```tsx
const { wallet } = useWallet()
const { signAndSend } = useSign()

if (!wallet) return <p>Provisioning wallet…</p>

const send = () => signAndSend({ to: '0x...', value: '0.01' })
```

## Examples

### Send native ETH

```tsx
const { signAndSend, pending } = useSign()

const onClick = async () => {
  const { txHash, attestationSlug } = await signAndSend({
    to: '0x000000000000000000000000000000000000dEaD',
    value: '0.01',
  })
  console.log('broadcast', txHash)
  console.log('proof', `https://spacy.computer/proof/${attestationSlug}`)
}
```

### Call a contract method

```tsx
import { encodeFunctionData, parseAbi } from 'viem'

const abi = parseAbi(['function mint(address to, uint256 amount)'])

await signAndSend({
  to: '0xContract...',
  data: encodeFunctionData({
    abi,
    functionName: 'mint',
    args: [recipient, 1n],
  }),
  gas: 120_000n,
})
```

### Display the proof link inline

```tsx
const { signAndSend, lastResult } = useSign()

return (
  <>
    <button onClick={() => signAndSend(req)}>Send</button>
    {lastResult && (
      <a href={`https://spacy.computer/proof/${lastResult.attestationSlug}`}>
        View attestation
      </a>
    )}
  </>
)
```

### Catch and report failures

```tsx
const { signAndSend, error } = useSign()

const send = async () => {
  try {
    await signAndSend(req)
  } catch (e) {
    // toast(e.message)
  }
}

return (
  <>
    <button onClick={send}>Send</button>
    {error && <p role="alert">{error.message}</p>}
  </>
)
```

See [Errors](../notes/errors.md) for the error codes you can encounter.

## What happens under the hood

The hook calls `client.signAndSend(req, wallet)`. That method:

1. Converts string `value` with `parseEther`.
2. Reads `nonce` and EIP-1559 fees from the public RPC in parallel.
3. Builds a `TransactionSerializableEIP1559` and computes its keccak256 digest.
4. `POST /sign/digest` to the Spacy backend with `{ digest, txMetadata }`.
5. Splices the returned signature back into the transaction.
6. `sendRawTransaction(serialized)`.
7. Returns `{ txHash, attestationSlug: slug }`.

See [How it works](../how-it-works.md#end-to-end-transaction-flow) for the full step-by-step.

## See also

* [`useAttestation`](use-attestation.md) — track the proof's IPFS pin and on-chain pointer.
* [`SpacyClient.signAndSend`](spacy-client.md#signandsend) — the imperative version.
