---
description: Every public type the @spacy-computer/sdk barrel exports.
---

# Types

The SDK is TypeScript-first. The published package ships its own `dist/index.d.ts` — no separate `@types/` install needed.

The full public type surface from the package barrel:

```ts
import {
  // runtime
  SpacyProvider,
  useSpacy,
  useWallet,
  useSign,
  useAttestation,
  SpacyClient,
  // types
  type SpacyClientConfig,
  type SignRequest,
  type SignResult,
  type WalletInfo,
  type SendState,
  type Hex,
} from '@spacy-computer/sdk'
```

Anything not in that import is internal and not part of the public contract.

## Provider

```ts
interface SpacyClientConfig {
  apiBaseUrl: string
  chainId: number
  rpcUrl?: string
}
```

## Wallet

```ts
interface WalletInfo {
  address: Hex          // 0x-prefixed Ethereum address
  createdAt: string     // ISO 8601
  provenance: {
    entropyHash: string
    entropySig: string
    satelliteSource: string
  }
}
```

The signed-in user shape (`SessionUser`) is observed via `useWallet().user` and `useSpacy().user`. Its runtime shape:

```ts
{
  id: string         // uuid
  email: string
  name: string | null
}
```

## Signing

```ts
interface SignRequest {
  to: Hex
  value?: bigint | string  // string is treated as ETH and parsed via parseEther
  data?: Hex
  gas?: bigint
}

interface SignResult {
  txHash: Hex
  attestationSlug: string
}

// Typed via SendState while a signAndSend call is in flight; surfaced
// indirectly through useSign().pending / .error / .lastResult.
type SendState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; error: Error }
  | { kind: 'sent'; result: SignResult }
```

## Proof payload (observed via `useAttestation`)

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
  createdAt: string
}
```

## Attestation receipt (v1)

The shape of `proof.receipt` once the IPFS pin completes. Canonical spec lives at [spacy.computer/spec/attestation/v1](https://spacy.computer/spec/attestation/v1).

```ts
interface AttestationReceiptV1 {
  version: 'spacy-attestation/1'
  spec: string  // canonical spec URL

  transaction: {
    chainId: number
    txHash: Hex
    from: Hex
    to: Hex
    nonce: number
    digestSigned: Hex
    signedAt: string
  }

  signer: {
    kind: 'spacecomputer-orbitport-kms'
    keyId: string
    quoteHex: string         // raw Intel TDX quote
    quoteVerified: boolean
    measurement?: string     // MRTD from the quote
  }

  coordinator: {
    kind: 'spacy-backend-sev-snp'
    selfAttestation: {
      reportHex: string       // raw AMD SEV-SNP report
      vlek: string
      measuredBootHash: string
      ec2InstanceId: string
      fetchedAt: string
    }
  }

  entropy: {
    source: string            // e.g. "aptosorbital"
    valueHex: string          // 32-byte hex (no 0x prefix)
    signatureHex: string      // satellite signature
    fetchedAt: string
  }

  verification: {
    instructions: string      // URL — verification walkthrough
    trustAnchorBundle: string // IPFS CID — bundled Intel + AMD roots
  }

  issuedAt: string
}
```

The receipt is the SDK's most important payload. It is what makes a Spacy transaction independently verifiable — see the public verification walkthrough on [spacy.computer/verify](https://spacy.computer/verify).

## Hook return types

The hook return interfaces (`UseWallet`, `UseSign`, `UseAttestation`) are not currently re-exported from the package barrel. If you need them in your own code, derive from the hook itself:

```ts
import { useWallet } from '@spacy-computer/sdk'

type UseWallet = ReturnType<typeof useWallet>
```

## See also

* [Reference index](spacy-provider.md) — every API the SDK exposes.
* [npm package](https://www.npmjs.com/package/@spacy-computer/sdk) — install metadata, latest version, README.
