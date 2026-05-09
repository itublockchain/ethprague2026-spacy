---
description: React-first embedded wallet SDK with verifiable, attested signing.
---

# Introduction

`@spacy-computer/sdk` is the official client SDK for **Spacy** — an embedded wallet whose signing key lives in TEE-backed hardware (Intel TDX), whose coordinator attests itself (AMD SEV-SNP), and whose every transaction emits a verifiable receipt — pinned to IPFS, pointed to from chain, validatable by anyone without trusting Spacy.

The SDK gives you Privy-style UX (Google sign-in, hosted wallet, one-call transaction signing) on top of that trust model.

## What you get

* **`<SpacyProvider>`** — wraps your React tree, owns the session and the wallet state, redirects to Google for sign-in.
* **`useWallet()`** — current user, current wallet, `login()` / `logout()` / `refresh()`.
* **`useSign()`** — `signAndSend(req)` builds an EIP-1559 transaction in the browser, asks the Spacy backend (running inside a SEV-SNP TEE) to sign the digest with the user's KMS key, and broadcasts.
* **`useAttestation(slug)`** — polls the proof endpoint until the IPFS pin and the on-chain pointer settle, so you can render a proof page or surface the receipt link in your UI.
* **`SpacyClient`** — the imperative class behind the hooks, for non-React consumers or custom orchestration.

## Three lines to integrate

```tsx
import { SpacyProvider, useWallet, useSign } from '@spacy-computer/sdk'

<SpacyProvider config={{ apiBaseUrl: 'https://api.spacy.computer', chainId: 11155111 }}>
  <App />
</SpacyProvider>
```

```tsx
const { wallet, login } = useWallet()
const { signAndSend } = useSign()

await signAndSend({ to: '0x...', value: '0.01' })
```

That's the whole surface. The browser does no signing — it only constructs the unsigned transaction, asks the attested backend for a signature over the digest, splices it back in, and broadcasts.

## Where to go next

| If you want to... | Go to |
|---|---|
| Install the SDK and render a sign-in button | [Getting started](getting-started.md) |
| Understand the request flow end-to-end | [How it works](how-it-works.md) |
| See every prop, hook return, and type | [Reference](reference/spacy-provider.md) |
| Copy a working example | [Recipes](recipes/sign-in.md) |
| Catch and handle errors | [Errors](notes/errors.md) |

## Compatibility

| Requirement | Version |
|---|---|
| Latest published | `0.0.1-alpha.0` (alpha — API may still shift) |
| React (peer) | `^18.3.0` or `^19.0.0` |
| `viem` (peer) | `^2.21.0` |
| Module formats | Dual ESM + CJS (`import` and `require` both work) |
| TypeScript | First-class — `dist/index.d.ts` ships with the package |
| Chains supported out of the box | Sepolia (`11155111`), Base Sepolia (`84532`); any EVM chain via custom `chainId` + `rpcUrl` |

## License

`@spacy-computer/sdk` is published under **AGPL-3.0** as part of the [Spacy monorepo](https://github.com/itublockchain/spacy). Deliberate, not default — embedded wallet trust models should be inspectable. If you fork the SDK and run a derived service, you publish your modifications.
