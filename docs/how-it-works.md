---
description: How @spacy-computer/sdk talks to the attested Spacy backend, where each step happens, and what the trust chain looks like.
---

# How it works

## The split

`@spacy-computer/sdk` is a **browser-side orchestrator**. The signing key, the entropy witness, and the attestation report all live server-side, inside hardware-backed TEEs. The SDK never sees a private key.

```
┌──────────────────────────────────────────────────────────────────┐
│                      Your app (browser)                          │
│                                                                  │
│   <SpacyProvider> ── SpacyClient ── viem PublicClient            │
│                          │                                       │
│              builds unsigned EIP-1559 tx                         │
│              computes keccak256 digest                           │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │  POST /sign/digest  (httpOnly cookie)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│      Spacy backend — AWS EC2 c6a (AMD SEV-SNP)                   │
│      attests itself, exposes /health/attestation                 │
│              │                                                   │
│              ├─► Orbitport cTRNG  (satellite-signed entropy)     │
│              ├─► Orbitport KMS    (Intel TDX signer)             │
│              └─► Pinata + Sepolia (receipt + on-chain pointer)   │
└──────────────────────────────────────────────────────────────────┘
```

The browser does the cheap, public, replayable work. The TEE does the work that has to be witnessed.

## End-to-end transaction flow

Walk through what `signAndSend({ to, value })` does, step by step:

1. **Read chain state.** The SDK uses an internal `viem` `PublicClient` (`viem` is a peer dependency you install) to fetch the wallet's `nonce` and current EIP-1559 fees in parallel from your configured RPC.
2. **Build the unsigned transaction.** `buildUnsigned()` produces a `TransactionSerializableEIP1559` from `{ chainId, nonce, to, value, data, maxFeePerGas, maxPriorityFeePerGas, gas }`. Defaults: `data: '0x'`, `gas: 21_000n`.
3. **Compute the digest.** `keccak256(serializeTransaction(unsigned))`. This is the 32 bytes that get signed.
4. **Send digest + tx metadata to the backend.** `POST /sign/digest` with `{ digest, txMetadata }`. The browser carries the `httpOnly` session cookie.
5. **Backend signs inside the TEE.** The Spacy API (running in SEV-SNP):
   * Looks up the user's `kmsKeyId`.
   * Fetches a fresh cTRNG sample from a satellite — the **signing entropy witness**.
   * Calls `kms.sign(kmsKeyId, digest)`. The KMS, running in **Intel TDX**, returns a 65-byte ECDSA signature **plus a TDX attestation quote** covering this signing operation.
   * Verifies the TDX quote offline against the bundled Intel root CA.
   * Persists a pending `Transaction` row plus an `Attestation` row carrying the KMS quote and the entropy witness.
6. **Backend returns `{ signature, slug }`.** The slug is the public, opaque identifier for the proof page.
7. **SDK splices the signature.** `spliceSignature()` calls `viem`'s `parseSignature()` and re-serializes the transaction with the signature attached.
8. **SDK broadcasts.** `publicClient.sendRawTransaction({ serializedTransaction })` to the configured RPC. Returns the broadcast `txHash`.
9. **SDK returns to the caller.** `{ txHash, attestationSlug: slug }`.

After step 9, the backend (non-blocking) assembles the full attestation receipt JSON, pins it to IPFS through Pinata, and emits an `AttestationPublished(wallet, txHash, ipfsCid)` event on Sepolia. The `useAttestation(slug)` hook polls until both of those settle.

## Where each fact lives

| Fact | Lives in | Witnessed by |
|---|---|---|
| Private key bytes | Intel TDX inside Orbitport KMS | TDX quote (Intel root CA) |
| Code running the orchestration | AMD SEV-SNP on AWS EC2 | SEV-SNP report (AMD root CA) |
| Entropy used to mark sign-time | Satellite hardware | Satellite signature, archived to IPFS public beacon |
| The signed transaction | Sepolia chain state | Standard EVM consensus |
| The full receipt | IPFS | CIDv1 content addressing |
| Pointer from `txHash` → `ipfsCid` | Sepolia event log | Standard EVM consensus |

A verifier reconstructs the chain by walking these in reverse, **without** trusting Spacy. The SDK doesn't perform this verification — it produces inputs that downstream verifiers consume. See the public verification walkthrough on [spacy.computer/verify](https://spacy.computer/verify).

## State the provider owns

`SpacyProvider` keeps four pieces of state on the React side:

* `client` — a memoized `SpacyClient` instance. Rebuilt when `apiBaseUrl` or `chainId` change.
* `user: SessionUser | null` — `null` if not signed in.
* `wallet: WalletInfo | null` — auto-provisioned on first sign-in by calling `POST /wallet/provision`. `null` until provisioning resolves.
* `ready: boolean` — flips to `true` after the initial `refresh()` call settles, regardless of outcome.

`refresh()` re-fetches `user` and `wallet`. It runs once on mount and is exposed on `useWallet()` for callers that want to manually re-sync (e.g., after closing a sign-in tab).

## What the SDK does not do

* **It does not store private keys.** Anywhere. Not in memory, not in `localStorage`, not in IndexedDB.
* **It does not handle gas funding.** Your user's wallet pays for its own transactions on the configured chain. The SDK does not run a relayer or paymaster.
* **It does not verify TDX or SEV-SNP quotes in the browser.** Verification happens server-side at sign time, and any third-party verifier can re-run it offline using the receipt and the bundled trust anchors. The SDK surfaces `kmsQuoteVerified` on the proof payload but does not re-check it client-side.
* **It does not subscribe to events on chain.** `useAttestation()` polls the Spacy API every 4 seconds for proof status; that endpoint is what watches the chain.

That's the whole model. Continue to [Reference →](reference/spacy-provider.md) for the API shapes, or jump to [Recipes →](recipes/sign-in.md) for working code.
