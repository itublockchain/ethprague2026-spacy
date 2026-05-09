---
description: Frequently asked questions about @spacy-computer/sdk.
---

# FAQ

## Why does the SDK make me redirect for sign-in instead of opening a popup?

Embedded popups are increasingly blocked by mobile browsers, by privacy modes, and by enterprise security policies. A full-page redirect is the most reliable cross-environment option. We may add a popup mode later as an opt-in for desktop apps.

## Where does the private key live?

Inside SpaceComputer's Orbitport KMS, which runs in **Intel TDX** hardware. The key never leaves Intel TDX. The SDK never sees it. The Spacy backend never sees it. Every signing operation produces an Intel TDX attestation quote that anyone can verify offline against Intel's root CA.

See [How it works](../how-it-works.md) for the full trust chain.

## Can I export the private key?

No, not in this version. Self-custody export is on the SpaceComputer roadmap (key extraction with attested zeroization). When that ships, the SDK will gain a corresponding API.

## Is `@spacy-computer/sdk` post-quantum?

No. ECDSA over secp256k1 is what the SDK signs with today — same as every other Web3 wallet. SpaceComputer has a published post-quantum migration path (ML-DSA, layered via the satellite TPM), and Spacy's architecture treats the KMS as a swappable signing backend. When PQC primitives go live, the SDK migrates by changing one parameter. The receipt schema is already designed to carry both classical and post-quantum signatures side-by-side under a future `spacy-attestation/2` version.

## What chains are supported?

Sepolia and Base Sepolia out of the box. Any EVM chain with `chainId` + `rpcUrl`. See [Supported chains](chains.md).

## Why does `signAndSend` need the wallet to be auto-provisioned?

The wallet provisioning step creates the user's KMS key and persists the address. Until that completes, there's nothing to sign with. The provider auto-runs `POST /wallet/provision` on first sign-in and surfaces `wallet` once it resolves. Gate `signAndSend` calls on `useWallet().wallet` being non-null.

## How long does provisioning take?

Typically under 2 seconds end-to-end. The bottleneck is the Orbitport KMS round-trip; the cosmic entropy fetch is parallelizable and contributes a few hundred ms.

## How do I run the SDK in local development?

The hosted Spacy API is configured for production origins. For local dev:

1. Run the Spacy API locally (`apps/api` in the monorepo) with `MOCK_ATTESTATION=true`.
2. Run your frontend on `http://localhost:5173` (or whatever the API's CORS allows).
3. Both must agree on `apiBaseUrl` (`http://localhost:8080` by default).
4. The session cookie is `SameSite=None`, which requires HTTPS in modern browsers. The bundled `.env.example` flips it to `SameSite=Lax` for development.

If you only want to integrate the SDK against the hosted API, your domain needs to be in the API's CORS allow-list. Email **support@spacy.computer**.

## Can I use the SDK without React?

Yes — use [`SpacyClient`](../reference/spacy-client.md) directly. You'll lose the auto-provisioning and reactive state, but the imperative methods (`api.me`, `api.signDigest`, `signAndSend`, etc.) are all there.

## Why doesn't `useSign` let me set the nonce or fees manually?

Because almost everyone who reaches for those overrides is doing so in error, and getting them wrong silently fails. The SDK uses the RPC's reported nonce and EIP-1559 estimates. If you genuinely need custom values (e.g., a transaction-replacement flow), drop down to `SpacyClient` and `client.publicClient` and build the unsigned transaction yourself, then call `client.api.signDigest({ digest, txMetadata })` directly.

## What's `attestationSlug` and why isn't it the same as `txHash`?

The slug is an opaque public identifier for the proof page. It's intentionally **not** derivable from `txHash` because sharing a proof URL should not leak the underlying transaction unless the recipient already has the slug. `txHash` is on-chain and public anyway; the slug is a privacy-preserving discovery key.

## Can I render a proof page on a server (SSR)?

Not via `useAttestation` — it's client-only and depends on React state. Server-side, fetch `GET /proof/:slug` directly (it's an unauthenticated public endpoint) and render the result.

## What if the IPFS pin fails?

`proof.status` becomes `pin_failed`. The receipt JSON still exists server-side; it just lacks a public CID. There's no SDK API to retry the pin in this version — escalate to support if it matters.

## What if the on-chain emit fails?

`proof.status` becomes `onchain_failed`. The IPFS-pinned receipt is still independently verifiable; you just lose the chain-side discovery index. Most users won't notice.

## Where do I file bugs?

[github.com/itublockchain/spacy/issues](https://github.com/itublockchain/spacy/issues).

## License?

AGPL-3.0. Forks and derivatives must publish their source.
