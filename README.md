# Spacy

Sign in with Google. Sign across orbit. Verifiable cosmic entropy.

## The Problem

Self-custody on Ethereum still asks ordinary users to do impossible things. Write down twelve random words. Don't lose them. Don't photograph them. Don't paste them. Don't trust anyone with them — including, eventually, yourself.

The mainstream alternative is to hand the key to someone else. Centralized exchanges hold your funds. Embedded wallet vendors hold your key material in their own infrastructure and ask you to take their word for what runs there. "Non-custodial-ish" is the polite framing; the honest one is that **you have to trust the operator's claim about their own software**, with no way to verify it from the outside.

There's a third path that's been technically possible for years but practically absent from consumer wallets: **hardware-attested signing in trusted execution environments**, witnessed by an entropy source no operator controls, with receipts a third party can verify offline. That's the wallet shape this repo ships.

## The Solution

**Spacy** is an orbital threshold wallet. You sign in with Google — there is no seed phrase. The signing key lives inside an **Intel TDX** KMS exposed by [SpaceComputer Orbitport](https://spacecomputer.io/), the orchestration coordinator runs inside an **AMD SEV-SNP** confidential VM, and every transaction ships with an attestation receipt pinned to **IPFS** with an on-chain pointer event. A satellite-signed entropy sample is mixed in at sign time as a third-party witness that the signing actually happened when the receipt says it did.

No seed phrase. No custodian. No "trust us." **A wallet you don't have to trust because anyone, anywhere can verify it.**

## How It Works

```mermaid
sequenceDiagram
    participant Client as Browser (SDK)
    participant Coord as Coordinator (SEV-SNP)
    participant Sat as SpaceComputer Satellite
    participant KMS as Orbitport KMS (Intel TDX)
    participant IPFS as Pinata / IPFS
    participant Chain as Sepolia

    Client->>Client: Build unsigned EIP-1559 tx, compute keccak256 digest
    Client->>Coord: POST /sign/digest { digest, txMetadata }
    Coord->>Sat: Sample cTRNG entropy (signing witness)
    Sat-->>Coord: Random bytes + satellite signature
    Coord->>KMS: kms.sign(keyId, digest)
    KMS-->>Coord: ECDSA signature + Intel TDX quote
    Coord->>Coord: Verify TDX quote vs Intel root CA, persist
    Coord-->>Client: { signature, attestationSlug }
    Client->>Chain: sendRawTransaction(serialized + sig)
    Chain-->>Client: txHash
    Coord->>IPFS: Pin attestation receipt JSON
    Coord->>Chain: emit AttestationPublished(wallet, txHash, ipfsCid)
    Note over Sat,Chain: Anyone can re-verify the chain offline:<br/>Intel TDX → AMD SEV-SNP → satellite key → CIDv1
```

1. **Browser builds the unsigned tx** with viem and computes the digest. The private key never touches the client.
2. **Coordinator (SEV-SNP)** samples a cTRNG witness from a satellite, asks **Orbitport KMS (Intel TDX)** to sign the digest, and persists the TDX quote alongside the signing entropy.
3. **Browser splices the signature** and broadcasts the raw tx itself — so the user's wallet pays the on-chain gas, not a hidden relayer.
4. **Coordinator pins the receipt to IPFS** and emits `AttestationPublished(wallet, txHash, ipfsCid)` on Sepolia as a censorship-resistant discovery index.
5. **Verifiers walk the chain offline.** Intel root CA → AMD ARK → SpaceComputer satellite key → IPFS CID → on-chain event. No step requires trusting `spacy.computer`.

## Key Features

**🔑 Sign in with Google — No Seed Phrases** — Google OAuth maps to a wallet, the wallet maps to a TDX-resident KMS key. No mnemonic, no recovery sheet, no browser extension — but also not custodial, because the key isn't in our infrastructure either.

**🛰️ Satellite-Witnessed Entropy** — Every signature mixes in a fresh cTRNG sample from a [SpaceComputer](https://spacecomputer.io/) satellite, signed by the satellite's hardware key. Operators can fake a clock; they can't fake a signed beacon from orbit they don't control.

**🔐 Heterogeneous TEEs (Intel TDX + AMD SEV-SNP)** — The signer runs in **Intel TDX**, the coordinator runs in **AMD SEV-SNP**, and the receipt embeds quotes from both. A vulnerability in either silicon line doesn't compromise the receipt unless the same flaw exists in both — defense-in-depth as a stack invariant, not a slide.

**📜 On-Chain Attestation Index** — A 24-line `SpacyAttestations` contract on Sepolia emits `AttestationPublished(wallet, txHash, ipfsCid)` for every signed transaction. The contract is intentionally not a trust anchor — it's a discovery index. The trust lives in the receipt.

**🌐 IPFS-Pinned Receipts** — Receipt JSON pinned via Pinata, content-addressed by CIDv1. Anyone can fetch it from any gateway and verify it offline against bundled root certs.

**🪪 Self-Attested Coordinator** — The backend exposes `/health/attestation` carrying its own SEV-SNP report at boot. You can verify the running binary before you trust any signing path it stands up — and the report is included with every receipt the coordinator emits.

**🛠️ Drop-in SDK** — `@spacy-computer/sdk` ships a single `<SpacyProvider>` plus three hooks (`useWallet`, `useSign`, `useAttestation`). Five minutes from `npm install` to a working "Sign in with Google → send 0.02 ETH on Sepolia" demo.

**🛡️ AGPL-3.0** — Every byte that ships in production is open. If we change the deployed coordinator, we ship the change. If we go away, you can run it yourself.

## Why Not Just Use Privy or Dynamic?

| | Privy | Dynamic | **Spacy** |
|---|---|---|---|
| **Who sees the private key** | Vendor's MPC nodes | Vendor's MPC nodes | **Intel TDX silicon — nobody** |
| **Attestation of running code** | Marketing copy | Marketing copy | **TDX + SEV-SNP quotes embedded in every receipt** |
| **Entropy auditability** | Vendor's RNG (trust us) | Vendor's RNG (trust us) | **Satellite-signed cTRNG witness per signature** |
| **Receipt that survives the operator** | No | No | **IPFS CID + on-chain `AttestationPublished` event** |
| **Offline third-party verification** | Vendor's word | Vendor's word | **Intel root → AMD ARK → satellite key — walk it offline** |
| **If the operator goes away** | Wallet bricked | Wallet bricked | **Old receipts still verify; SDK is open and forkable** |
| **Open source surface** | Partial / proprietary core | Partial / proprietary core | **AGPL — every byte that runs in production** |
| **Can a regulator force a sign-on-demand?** | Effectively yes | Effectively yes | **No — no plaintext key exists outside TDX** |

## Quick Start

### Option 1: Demo Web App (fastest)

```bash
# Visit the live demo
open https://spacy.computer

# 1. Sign in with Google
# 2. Backend auto-provisions a Sepolia wallet inside an Intel TDX KMS
# 3. Get test ETH from any Sepolia faucet → your spacy address
# 4. Send 0.02 ETH — watch the orbital sign animation
# 5. Open the proof page (link on the success card) to walk the trust chain
```

### Option 2: TypeScript SDK

```bash
npm install @spacy-computer/sdk react viem
```

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
  const { user, wallet, ready, login } = useWallet()
  const { signAndSend, pending } = useSign()

  if (!ready) return null
  if (!user) return <button onClick={login}>Sign in with Google</button>

  return (
    <button
      disabled={pending}
      onClick={async () => {
        const { txHash, attestationSlug } = await signAndSend({
          to: '0x5Ba55eaBD43743Ef6bB6285f393fA3CbA33FbA5e',
          value: '0.02', // ETH, string accepted
        })
        // Tx broadcast on Sepolia. attestationSlug → public verifiable proof page.
      }}
    >
      Send 0.02 ETH
    </button>
  )
}
```

### Option 3: Verify a Receipt (no SDK)

Anyone can verify a Spacy transaction offline — the SDK is for senders, not for verifiers.

```bash
# Read the on-chain event
cast logs --rpc-url sepolia \
  --address 0xCe31398be624975941e71F94eC6D4c5472449B00 \
  'AttestationPublished(address,bytes32,string)' \
  --from-block <block>

# Fetch the receipt from any IPFS gateway
curl https://gateway.pinata.cloud/ipfs/<ipfsCid> > receipt.json

# Then walk the chain (root CAs ship with the SDK):
#   - Verify Intel TDX quote vs Intel root CA
#   - Verify AMD SEV-SNP report vs AMD ARK
#   - Verify cTRNG witness vs SpaceComputer satellite key
```

See the [public verification walkthrough](https://spacy.computer/verify) for a guided run-through.

## Architecture

```mermaid
graph TD
    subgraph Clients
        A[Demo Web App<br/>Vite · React · R3F]
        B[Third-party app<br/>via @spacy-computer/sdk]
    end

    subgraph Coordinator["Coordinator — AMD SEV-SNP (AWS EC2 c6a)"]
        E[Express · TypeScript · Prisma]
        F[Self-attestation cache<br/>SEV-SNP report]
    end

    subgraph Orbitport["SpaceComputer Orbitport"]
        K[KMS · Intel TDX]
        L[cTRNG · satellite-signed]
    end

    subgraph Storage
        H[Postgres · users / wallets / attestations]
        I[Pinata · IPFS pinning]
    end

    subgraph Chain["Sepolia"]
        J[SpacyAttestations.sol]
    end

    A --> E
    B --> E
    E --> F
    E --> K
    E --> L
    E --> H
    E --> I
    E --> J
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite 6, React 19, TypeScript (strict), Tailwind CSS v4, React Three Fiber, drei, GSAP, motion, viem |
| **Backend** | Express, TypeScript, Prisma, PostgreSQL, Passport (Google OAuth), JWT (jose), Zod, pino |
| **SDK** | `@spacy-computer/sdk` — published to npm; React hooks + `SpacyClient` over the backend HTTP API |
| **Contracts** | Foundry, Solidity 0.8.27, Sepolia |
| **TEEs** | Intel TDX (Orbitport KMS), AMD SEV-SNP (AWS EC2 c6a confidential compute) |
| **Entropy** | SpaceComputer Orbitport cTRNG (satellite-signed) |
| **Receipts** | IPFS via Pinata, CIDv1 content addressing |
| **Chain** | Sepolia — viem public RPC |
| **Monorepo** | Turborepo, Bun workspaces, Biome (lint + format) |

## Project Structure

```
spacy/
├── apps/
│   ├── api/                # Backend coordinator — Express + Prisma, runs in SEV-SNP
│   └── web/                # Frontend demo — Vite + React, orbital sign theatre
├── packages/
│   ├── sdk/                # @spacy-computer/sdk — published consumer SDK
│   ├── shared/             # @spacy/shared — Zod schemas, ABIs, attestation utils
│   └── contracts/          # SpacyAttestations.sol (Foundry)
├── deploy/                 # EC2 user-data + Caddy + docker-compose for prod
├── docs/                   # GitBook-style SDK docs
├── scripts/                # Dev / provisioning shell scripts
├── docker-compose.dev.yml  # Local Postgres for dev
├── turbo.json              # Turborepo task graph
└── package.json            # Bun workspaces root
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh/) v1.3.8+
- [Node.js](https://nodejs.org/) v20.19+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local Postgres)
- A Google OAuth client (for the dev login flow)
- Orbitport client credentials (sandbox keys are fine for dev)
- A Pinata JWT for IPFS pinning

### 1. Clone & Install

```bash
git clone https://github.com/itublockchain/spacy.git
cd spacy

# Install all workspace dependencies from root
bun install
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env.local
```

Fill in `apps/api/.env.local`:

```env
# Database (Docker provides this on dev)
DATABASE_URL="postgresql://spacy:dev@localhost:5432/spacy?schema=public"

# Server
PORT=8080
NODE_ENV=development
APP_BASE_URL="http://localhost:8080"
WEB_BASE_URL="http://localhost:5173"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:8080/auth/google/callback"
JWT_SECRET="..."   # 48+ random bytes

# Orbitport (SpaceComputer)
ORBITPORT_BASE_URL="https://op.spacecomputer.io"
ORBITPORT_AUTH_URL="https://auth.spacecomputer.io"
ORBITPORT_CLIENT_ID="..."
ORBITPORT_CLIENT_SECRET="..."

# Pinata (IPFS)
PINATA_JWT="..."
PINATA_GATEWAY="https://gateway.pinata.cloud"

# Chain
CHAIN_ID=11155111
RPC_URL="https://ethereum-sepolia.publicnode.com"
ATTESTATION_CONTRACT_ADDRESS="0xCe31398be624975941e71F94eC6D4c5472449B00"
RELAYER_PRIVATE_KEY="0x..."   # Pays gas for AttestationPublished events only

# TEE
# Production runs on AMD SEV-SNP hardware and emits a real report.
# Set this to `true` only on local dev hardware that doesn't expose /dev/sev-guest.
MOCK_ATTESTATION=false
```

### 3. Configure the Web App

```bash
cp apps/web/.env.example apps/web/.env.local
```

```env
VITE_SPACY_API_URL=http://localhost:8080
VITE_SEPOLIA_RPC_URL=https://sepolia.gateway.tenderly.co
```

### 4. Start everything

```bash
# From the repo root
bun run dev
```

This wraps:

- `bun run db:up` — boot the Postgres container
- `bun run db:wait` — wait for the DB to be ready
- `bun run db:migrate` — apply Prisma migrations
- `turbo run dev` — start `@spacy/api`, `@spacy/web`, and the SDK watcher in parallel

After it settles:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080

> First time on the SDK? Run `bun --filter @spacy-computer/sdk build` once before `bun dev` so the workspace consumers can resolve `dist/`.

### Useful Commands

```bash
bun run build                              # Build all workspaces
bun run lint                               # Biome — lint
bun run lint:fix                           # Biome — auto-fix
bun run typecheck                          # TS strict mode across the monorepo
bun run db:reset                           # Wipe Postgres volume + re-migrate
bun run db:down                            # Stop the Postgres container

bun --filter @spacy/api prisma:migrate     # Create + apply a new migration (dev)
bun --filter @spacy/api prisma:generate    # Regenerate the Prisma client
bun --filter @spacy-computer/sdk build     # Build the SDK to `dist/`

cd packages/contracts && forge test        # Run the SpacyAttestations tests
```

## Roadmap

- [x] Backend coordinator with SEV-SNP self-attestation (real reports on production EC2 c6a)
- [x] Orbitport KMS integration (Intel TDX signer)
- [x] Satellite-witnessed cTRNG entropy
- [x] IPFS-pinned attestation receipts via Pinata
- [x] On-chain `AttestationPublished` discovery index
- [x] `@spacy-computer/sdk` published to npm
- [x] Web demo: Google sign-in → wallet provision → orbital sign theatre
- [x] Public proof page with offline verification walkthrough
- [x] Sepolia testnet deployment
- [ ] Mainnet — once the KMS quote endpoint stabilizes upstream
- [ ] Multi-chain: Base, Optimism, Arbitrum (same coordinator, per-chain RPC)
- [ ] Account abstraction adapter (ERC-4337) for gasless onboarding
- [ ] Verifier CLI (`spacy verify <slug>`) bundled with the SDK
- [ ] Recovery flow: link a second OAuth identity to the same KMS key

## Useful Links

- [Web App](https://spacy.computer/)
- [SDK on npm](https://www.npmjs.com/package/@spacy-computer/sdk)
- [SDK Docs](./docs/README.md)
- [Attestation contract on Sepolia](https://sepolia.etherscan.io/address/0xCe31398be624975941e71F94eC6D4c5472449B00)
- [SpaceComputer Orbitport](https://spacecomputer.io/)
- [Intel TDX](https://www.intel.com/content/www/us/en/developer/tools/trust-domain-extensions/overview.html)
- [AMD SEV-SNP](https://www.amd.com/en/developer/sev.html)

## License

[AGPL-3.0](./LICENSE) — every byte that runs the coordinator is open. If we change what's deployed, we ship the change.

## Team

- [Feyyaz Numan Cavlak](https://x.com/feyyazcigim)
- [Barış Bice](https://x.com/0xbaris_)

Built by [ITU Blockchain](https://x.com/ITUblockchain) at ETHPrague 2026.
