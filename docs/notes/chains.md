---
description: Chains the SDK supports out of the box and how to point at any other EVM chain.
---

# Supported chains

The SDK uses `viem`'s `createPublicClient` for chain reads and `sendRawTransaction` for broadcast. Two chains are recognized by id; any other chain works as long as you supply a custom `rpcUrl`.

## Built-in

| Chain | Chain id |
|---|---|
| Ethereum Sepolia | `11155111` |
| Base Sepolia | `84532` |

For these two, you can omit `rpcUrl`:

```ts
new SpacyProvider config={{ apiBaseUrl, chainId: 11155111 }} />
```

`viem` will use its bundled public RPC. Convenient for prototyping; **not** recommended for production — public RPCs are heavily rate-limited and occasionally desync.

## Any other EVM chain

Pass `chainId` and an explicit `rpcUrl`. The SDK builds a generic chain definition off Sepolia's metadata with your id and name. This is enough for `viem` to do the things `signAndSend` needs (read nonce, estimate fees, broadcast a raw transaction).

```ts
const config = {
  apiBaseUrl: 'https://api.spacy.computer',
  chainId: 12345,
  rpcUrl: 'https://my-evm-chain.example.com',
}
```

Caveats:

* **The Spacy backend must also support the chain.** Today, the production Spacy API signs and emits attestations on Sepolia. Pointing the SDK at a different chain will sign whatever digest you send, but the receipt's `transaction.chainId` will reflect what you signed, while the on-chain pointer is still emitted on the API's configured chain. Use a Spacy deployment configured for your target chain.
* **Spacy's KMS keys are chain-agnostic.** The same Ethereum-address-style key signs ECDSA digests for any EVM chain. No chain-specific key derivation.
* **Block explorer links** in the proof page recipe assume Sepolia (`sepolia.etherscan.io`). Adjust for your chain.

## What the chain id changes

| Behaviour | Affected by `chainId` |
|---|---|
| `viem` chain definition (block explorer URLs in errors, default RPC) | yes |
| EIP-1559 fee estimation | indirectly (via the RPC the chain id selects) |
| Transaction encoding (chainId field, EIP-155 replay protection) | yes |
| Wallet KMS key | no (one key, any EVM chain) |
| Receipt's `transaction.chainId` | yes |
| The Spacy backend's chain for emitting `AttestationPublished` | **no** — that's a backend config, not an SDK arg |

If you change the chain id at runtime, the provider rebuilds the `SpacyClient`. Inflight requests aren't cancelled — gate any user actions on the new client being ready.

## Picking an RPC

For production, use one of:

* Alchemy, Infura, QuickNode (commercial)
* Your own node (`geth`, `erigon`, `reth`)
* A trusted multi-provider gateway

Public RPCs are fine for hackathons and demos. Do not ship to mainnet against a public RPC.

## See also

* [`SpacyClientConfig`](../reference/spacy-provider.md#props) — where you set chain id and RPC URL.
* [`SpacyClient.publicClient`](../reference/spacy-client.md#clientpublicclient) — direct access to the underlying `viem` client.
