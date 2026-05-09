---
description: Render a verifiable proof page with the attestation receipt, IPFS pin, and on-chain pointer.
---

# Render a proof page

Build a `/proof/:slug` page that renders the full attestation receipt as the IPFS pin and on-chain emit settle. The hook polls every 4 seconds until terminal status; you only render.

```tsx
// src/pages/Proof.tsx
import { useAttestation } from '@spacy-computer/sdk'

export function Proof({ slug }: { slug: string }) {
  const { proof, error } = useAttestation(slug)

  if (error) return <p role="alert">Failed to load proof: {error.message}</p>
  if (!proof) return <p>Loading…</p>

  return (
    <article>
      <header>
        <h1>Spacy attestation</h1>
        <p>
          <code>{proof.txHash}</code> on chain <strong>{proof.chainId}</strong>
        </p>
        <StatusPill status={proof.status} />
      </header>

      {proof.receipt && (
        <>
          <Section title="Signer (Intel TDX)">
            <Field label="KMS keyId" value={proof.receipt.signer.keyId} />
            <Field label="Measurement (MRTD)" value={proof.receipt.signer.measurement ?? '—'} />
            <Field
              label="Quote verified"
              value={proof.kmsQuoteVerified ? '✓ verified' : '✗ unverified'}
            />
            <details>
              <summary>Raw quote</summary>
              <pre>{proof.receipt.signer.quoteHex}</pre>
            </details>
          </Section>

          <Section title="Coordinator (AMD SEV-SNP)">
            <Field label="EC2 instance" value={proof.receipt.coordinator.selfAttestation.ec2InstanceId} />
            <Field label="Boot hash" value={proof.receipt.coordinator.selfAttestation.measuredBootHash} />
            <Field
              label="Captured at"
              value={new Date(proof.receipt.coordinator.selfAttestation.fetchedAt).toLocaleString()}
            />
          </Section>

          <Section title="Entropy witness">
            <Field label="Source" value={proof.receipt.entropy.source} />
            <Field label="Witnessed at" value={new Date(proof.receipt.entropy.fetchedAt).toLocaleString()} />
            <Field label="Value" value={proof.receipt.entropy.valueHex} mono />
          </Section>

          <Section title="Anchors">
            {proof.ipfsUrl && (
              <Field
                label="IPFS"
                value={<a href={proof.ipfsUrl} target="_blank" rel="noreferrer">{proof.ipfsCid}</a>}
              />
            )}
            {proof.onchainTxHash && (
              <Field
                label="On chain"
                value={
                  <a
                    href={`https://sepolia.etherscan.io/tx/${proof.onchainTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {proof.onchainTxHash}
                  </a>
                }
              />
            )}
          </Section>
        </>
      )}

      <footer>
        <a href="https://spacy.computer/verify" target="_blank" rel="noreferrer">
          Verify yourself →
        </a>
      </footer>
    </article>
  )
}

type ProofStatus = NonNullable<ReturnType<typeof useAttestation>['proof']>['status']

function StatusPill({ status }: { status: ProofStatus }) {
  const label = {
    pending_pin: 'Pinning to IPFS…',
    pending_onchain: 'Emitting on chain…',
    complete: 'Complete',
    pin_failed: 'Pin failed',
    onchain_failed: 'On-chain emit failed',
  }[status]
  return <span data-status={status}>{label}</span>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <span>{label}</span>
      <span style={mono ? { fontFamily: 'monospace' } : undefined}>{value}</span>
    </div>
  )
}
```

## Wiring it up

If you use a router (React Router, TanStack Router, Next, etc.), the page is just a route that reads `slug` from the URL and renders `<Proof slug={slug} />`. The hook handles polling, cleanup, and re-fetching when the slug changes.

```tsx
// React Router example
<Route path="/proof/:slug" element={<ProofRoute />} />

function ProofRoute() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug) return null
  return <Proof slug={slug} />
}
```

## Lifecycle in practice

The page mounts immediately after `signAndSend` resolves, with `proof.status` likely starting at `pending_pin`. Within ~5–10 seconds you'll see it advance to `pending_onchain` and then `complete`. The `useAttestation` hook stops polling automatically once the status is terminal.

If you navigate to a proof page some time after the transaction (e.g., from a list of past transactions), the first response usually arrives already at `complete` — the hook fires once, sees a terminal status, and stops.

## Surfacing failure modes

* **`pin_failed`**: The IPFS pin failed and retries are exhausted. The receipt JSON still exists server-side — the user can request a re-pin (no SDK API for this yet; raise a support request).
* **`onchain_failed`**: IPFS pin succeeded but the on-chain emit reverted or could not be confirmed. The IPFS receipt is still independently verifiable; only the chain-side discovery index is missing.
* **`error` on the hook**: Network error reaching the Spacy API. The hook keeps the last `proof` value and continues polling on the next tick. Retries are automatic.

## See also

* [`useAttestation` reference](../reference/use-attestation.md) — full type and behaviour spec.
* [Send a transaction](send-transaction.md) — produces the slug this page consumes.
