---
description: API reference for the useAttestation hook — poll proof status until the IPFS pin and on-chain pointer settle.
---

# `useAttestation`

Polls the proof endpoint until the IPFS pin and on-chain pointer reach a terminal status. Useful for proof pages, attestation badges, and any UI that needs to wait for the off-chain pieces of a Spacy transaction to settle.

```ts
import { useAttestation } from '@spacy-computer/sdk'

function useAttestation(slug: string | null | undefined): UseAttestation

interface UseAttestation {
  proof: ProofPayload | null
  loading: boolean
  error: Error | null
}
```

## Argument

| Argument | Type | Notes |
|---|---|---|
| `slug` | `string \| null \| undefined` | The `attestationSlug` returned by `signAndSend`, or `null`/`undefined` to disable the hook. |

When `slug` is falsy, the hook is inert — `proof` stays at its last value, `loading` stays `false`, no requests are made.

## Returns

| Field | Type | Notes |
|---|---|---|
| `proof` | `ProofPayload \| null` | Latest payload from `GET /proof/:slug`. |
| `loading` | `boolean` | `true` during a fetch. Cleared between polls. |
| `error` | `Error \| null` | Set when a fetch rejects; cleared on the next successful fetch. |

## Polling behaviour

* The hook fires the first request immediately when `slug` becomes truthy.
* Each subsequent poll runs **4 seconds** after the previous response.
* Polling stops when `proof.status` reaches a terminal value: `complete`, `pin_failed`, or `onchain_failed`.
* Polling also stops when the component unmounts or `slug` changes — the existing timer is cleared.

This cadence is fixed by the SDK in this version. Bring your own logic if you need exponential backoff or push-based updates.

## Status lifecycle

```
pending_pin   ──► pending_onchain   ──► complete       (terminal, success)
                                  └──► onchain_failed  (terminal, failure)
        │
        └──► pin_failed                                (terminal, failure)
```

| Status | Meaning |
|---|---|
| `pending_pin` | Receipt JSON assembled; Pinata pin not yet confirmed. `ipfsCid` is `null`. |
| `pending_onchain` | Pinned to IPFS; `SpacyAttestations.publish` not yet confirmed. `ipfsCid` is set; `onchainTxHash` is `null` or unconfirmed. |
| `complete` | Pinned and confirmed on chain. `ipfsCid`, `onchainTxHash`, and `onchainBlockNumber` are all set. |
| `pin_failed` | Pinata rejected the upload, retries exhausted. Receipt may still be reproducible from the JSON, but no public CID exists. |
| `onchain_failed` | Pinned to IPFS, but the on-chain emit reverted or could not be confirmed. The IPFS receipt is still verifiable; just no chain pointer. |

## `ProofPayload` shape

```ts
interface ProofPayload {
  slug: string
  txHash: string
  chainId: number
  walletAddress: string
  status: 'pending_pin' | 'pending_onchain' | 'complete' | 'pin_failed' | 'onchain_failed'
  ipfsCid: string | null
  ipfsUrl: string | null
  onchainTxHash: string | null
  onchainBlockNumber: number | null
  kmsQuoteVerified: boolean
  receipt: AttestationReceiptV1 | null
  createdAt: string  // ISO 8601
}
```

The `receipt` field carries the full v1 attestation receipt (transaction details, KMS Intel TDX quote, coordinator AMD SEV-SNP self-attestation, cosmic entropy witness, verification anchors). It is `null` until the IPFS pin completes. The full schema is documented at the canonical spec URL: [spacy.computer/spec/attestation/v1](https://spacy.computer/spec/attestation/v1).

## Examples

### Wait for the pin and show a link

```tsx
const { proof } = useAttestation(slug)

if (!proof) return <Spinner />
if (proof.status === 'pending_pin') return <p>Pinning to IPFS…</p>
if (proof.status === 'pin_failed') return <p>Pin failed.</p>

return (
  <a href={proof.ipfsUrl ?? '#'} target="_blank">
    View attestation on IPFS
  </a>
)
```

### Render the full proof page

```tsx
function ProofPage({ slug }: { slug: string }) {
  const { proof, loading, error } = useAttestation(slug)

  if (error) return <Error error={error} />
  if (!proof) return <Spinner />

  return (
    <article>
      <h1>Transaction {proof.txHash}</h1>
      <Status value={proof.status} loading={loading} />
      {proof.receipt && (
        <>
          <SignerBlock signer={proof.receipt.signer} verified={proof.kmsQuoteVerified} />
          <CoordinatorBlock coordinator={proof.receipt.coordinator} />
          <EntropyBlock entropy={proof.receipt.entropy} />
        </>
      )}
      {proof.onchainTxHash && (
        <a href={`https://sepolia.etherscan.io/tx/${proof.onchainTxHash}`}>
          On-chain pointer
        </a>
      )}
    </article>
  )
}
```

### Build a small inline badge after `signAndSend`

```tsx
const { signAndSend, lastResult } = useSign()
const { proof } = useAttestation(lastResult?.attestationSlug)

return (
  <>
    <button onClick={() => signAndSend(req)}>Send</button>
    {proof?.status === 'complete' && <span>✓ attested</span>}
  </>
)
```

## See also

* [`useSign`](use-sign.md) — produces the slug this hook consumes.
* [Render a proof page](../recipes/proof-page.md) — full recipe.
* [Attestation receipt schema](https://spacy.computer/spec/attestation/v1) — canonical spec.
