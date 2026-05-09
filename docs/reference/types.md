---
description: Every public type the @spacy/sdk barrel exports.
---

# Types

The SDK is TypeScript-first. Types ship from `src/index.ts` directly — no `@types/` package needed.

```ts
import type {
  // Core
  SpacyClientConfig,
  WalletInfo,
  SignRequest,
  SignResult,
} from '@spacy/sdk'

// Re-exports from @spacy/shared (transitive — import from there for the
// fullest, version-locked types):
import type {
  SessionUser,
  WalletMeResponse,
  SignDigestRequest,
  SignDigestResponse,
  ProofPayload,
  AttestationReceiptV1,
} from '@spacy/shared/schemas'
```

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
  address: `0x${string}`
  createdAt: string
  provenance: {
    entropyHash: string
    entropySig: string
    satelliteSource: string
  }
}

interface SessionUser {
  id: string
  email: string
  name: string | null
}
```

## Signing

```ts
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

// Wire shape — what the SDK posts to /sign/digest under the hood:
interface SignDigestRequest {
  digest: `0x${string}`
  txMetadata: {
    chainId: number
    nonce: number
    to: `0x${string}`
    value: string
    data: `0x${string}`
    maxFeePerGas: string
    maxPriorityFeePerGas: string
    gas: string
  }
}

interface SignDigestResponse {
  signature: `0x${string}`
  slug: string
}
```

## Proof

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

The full receipt schema. Always available at `proof.receipt` once `proof.status` advances past `pending_pin`.

```ts
interface AttestationReceiptV1 {
  version: 'spacy-attestation/1'
  spec: string  // URL to the canonical spec

  transaction: {
    chainId: number
    txHash: `0x${string}`
    from: `0x${string}`
    to: `0x${string}`
    nonce: number
    digestSigned: `0x${string}`
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

```ts
import type { UseWallet, UseSign, UseAttestation } from '@spacy/sdk'
```

These three interfaces match the shapes returned by their respective hooks. They are not currently re-exported from the barrel file — import them from the hook source paths if you need them, or re-derive with `ReturnType<typeof useWallet>` etc.

## See also

* `@spacy/shared/schemas` — canonical zod schemas. Import from there for runtime validation.
* [Reference index](spacy-provider.md) — every API the SDK exposes.
