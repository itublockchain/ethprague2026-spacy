---
description: Errors thrown by @spacy-computer/sdk and how to handle each one.
---

# Errors

The SDK throws plain `Error` instances. Their messages are short, stable strings safe to switch on. Reading them with care is enough — you don't need a custom error class.

## SDK errors

| `error.message` | Source | When | What to do |
|---|---|---|---|
| `wallet_not_ready` | `useSign().signAndSend` | Called before `useWallet().wallet` resolved. | Gate the call site on `wallet` being non-null. |
| `useSpacy must be used inside <SpacyProvider>` | any hook | Hook called outside the provider tree. | Wrap your tree in `<SpacyProvider>`. |

## API errors

When the underlying HTTP call returns a non-2xx status, the SDK throws an internal `SpacyApiError`. Its message is `spacy_api_${status}`.

| `error.message` | HTTP | When | Recommended UX |
|---|---|---|---|
| `spacy_api_400` | 400 | Bad request — usually a malformed `txMetadata`. Treat as a bug; report. | Log; show a generic error. |
| `spacy_api_401` | 401 | Session expired or missing. | Trigger `login()` again. |
| `spacy_api_403` | 403 | Calling an owner-only endpoint with the wrong session. | Should not happen via the SDK; report. |
| `spacy_api_404` | 404 | Wallet missing on `/wallet/me` (mapped to `null`); proof slug not found. | For the proof case: show "not found". |
| `spacy_api_502` | 502 | Upstream failure (KMS, RPC, IPFS). | Retry once, then surface a transient error. |
| `spacy_api_503` | 503 | Dependency unreachable (cTRNG, KMS, Pinata). | Retry with backoff. |
| `spacy_api_500` | 500 | Unexpected; report. | Show a generic error and retry once. |

`me()` and `getWallet()` swallow `401` and `404` respectively and return `null` — you do **not** see those errors in normal use of `useWallet()`.

## Chain errors (from `viem`)

`signAndSend` ends with `publicClient.sendRawTransaction(...)`, which is just `viem`. Standard chain failures bubble up as `viem` errors:

| Common message contains | Why |
|---|---|
| `insufficient funds for gas * price + value` | Wallet has no ETH on the configured chain. |
| `nonce too low` | Likely a stale RPC; retry. |
| `replacement transaction underpriced` | Concurrent transactions racing for the same nonce. |
| `intrinsic gas too low` | `gas` argument too small for the calldata. Bump it. |
| `gas required exceeds allowance` | Same — bump `gas`. |

These are not specific to Spacy; the same errors occur on any EVM RPC.

## Handling pattern

```ts
try {
  await signAndSend({ to, value })
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e)

  if (msg === 'wallet_not_ready') return ui.warn('Hold on — wallet still provisioning')
  if (msg === 'spacy_api_401') return login()
  if (msg.includes('insufficient funds')) return ui.error('Not enough ETH for gas')

  ui.error('Something went wrong')
  log.report(e)
}
```

The hook also captures the error in `useSign().error`, so for many UIs you can just render a banner derived from the hook state without writing a try/catch at the call site.

## What is not currently exported

`SpacyApiError` is internal — the class is not re-exported from the SDK barrel. Catch as `Error` and switch on `error.message`. If your code base benefits from a typed discriminator, file an issue and we'll surface it.
