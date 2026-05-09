# @spacy-computer/sdk

Embedded wallet whose signing key lives in **SpaceComputer Orbitport** (Intel TDX KMS), whose coordinator runs in **AMD SEV-SNP**, and whose every transaction ships with an attestation receipt pinned to **IPFS** with an on-chain pointer.

> Sign in with Google. Send transactions on Sepolia. Anyone, anywhere can verify the signing TEE and the cosmic entropy witness without trusting Spacy.

## Install

```bash
npm install @spacy-computer/sdk react viem
# or
bun add @spacy-computer/sdk react viem
```

`react` (`^18.3 || ^19`) and `viem` (`^2.21`) are peer dependencies — the SDK is small because it doesn't ship them.

## Quick start

```tsx
import { SpacyProvider, useWallet, useSign } from '@spacy-computer/sdk'

function Root() {
  return (
    <SpacyProvider config={{ apiBaseUrl: 'https://api.spacy.computer', chainId: 11155111 }}>
      <App />
    </SpacyProvider>
  )
}

function App() {
  const { user, wallet, ready, login, logout } = useWallet()
  const { signAndSend, pending } = useSign()

  if (!ready) return null
  if (!user) return <button onClick={login}>Sign in with Google</button>

  return (
    <button
      disabled={pending}
      onClick={async () => {
        const { txHash, attestationSlug } = await signAndSend({
          to: '0x…',
          value: '0.01', // ETH, string accepted
        })
        // txHash is on Sepolia. attestationSlug resolves to a verifiable proof page.
      }}
    >
      Send 0.01 ETH
    </button>
  )
}
```

## What the SDK does

- **Auth**: redirects to your Spacy backend's `/auth/google`, returns with an httpOnly cookie session.
- **Wallet**: provisions an Orbitport KMS key on first auth (one-time), exposes the Ethereum address.
- **Sign**: builds the unsigned EIP-1559 tx in the browser with viem, hashes it, posts only the digest to backend, splices the returned signature, broadcasts via the public RPC.
- **Attestation**: the backend pins the receipt JSON to IPFS and emits an `AttestationPublished` event on Sepolia. The SDK exposes `useAttestation(slug)` to poll the proof state.

## Verification

Every receipt embeds enough data for an offline verifier to walk the trust chain:

1. Read the on-chain `AttestationPublished` event for a `txHash` → get the IPFS CID.
2. Fetch the JSON from any IPFS gateway.
3. Verify the embedded Intel TDX quote against the bundled root CA.
4. Verify the AMD SEV-SNP coordinator report against the AMD ARK.
5. Verify the cTRNG entropy signature against SpaceComputer's published satellite key.

No step in this chain requires trusting `spacy.computer`. The `@spacy-computer/sdk` exports the same Zod schemas and verify utilities the backend uses, so a third-party verifier can depend on this package alone.

## API surface

```ts
import {
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

## License

[AGPL-3.0](./LICENSE) — same as the rest of the Spacy stack.
