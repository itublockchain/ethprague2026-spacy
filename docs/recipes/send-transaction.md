---
description: Sign and broadcast an EIP-1559 transaction with attested provenance.
---

# Send a transaction

Wire `signAndSend` to a button. Show pending state, success state, and a proof link.

```tsx
import { useWallet, useSign } from '@spacy-computer/sdk'

const RECIPIENT = '0x000000000000000000000000000000000000dEaD' as const

export function SendButton() {
  const { wallet } = useWallet()
  const { signAndSend, pending, error, lastResult } = useSign()

  if (!wallet) return null

  const onClick = async () => {
    try {
      const { txHash, attestationSlug } = await signAndSend({
        to: RECIPIENT,
        value: '0.01', // ETH, parsed by the SDK
      })
      console.log('Broadcast:', txHash)
      console.log('Proof:', `https://spacy.computer/proof/${attestationSlug}`)
    } catch (e) {
      // already captured in `error`; rethrow only if you need to bubble
    }
  }

  return (
    <section>
      <button disabled={pending} onClick={onClick}>
        {pending ? 'Signing…' : 'Send 0.01 ETH'}
      </button>

      {error && <p role="alert">Failed: {error.message}</p>}

      {lastResult && (
        <p>
          Sent.{' '}
          <a href={`https://spacy.computer/proof/${lastResult.attestationSlug}`}>
            View attestation
          </a>
        </p>
      )}
    </section>
  )
}
```

## Calling a contract

For anything beyond a plain native transfer, encode the calldata yourself with `viem` and bump `gas`:

```tsx
import { encodeFunctionData, parseAbi } from 'viem'

const erc20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
])

await signAndSend({
  to: '0xToken...',
  data: encodeFunctionData({
    abi: erc20,
    functionName: 'transfer',
    args: [recipient, 1_000_000n], // 1 USDC if 6 decimals
  }),
  gas: 75_000n,
})
```

## Things to know

* **The wallet pays for its own gas.** `signAndSend` does not run a relayer or paymaster. Make sure the wallet has enough native ETH on the configured chain. On Sepolia, faucets like [sepoliafaucet.com](https://sepoliafaucet.com) work.
* **You can't override `nonce` or fees.** The SDK reads them from the configured RPC. If you need custom behaviour, drop down to [`SpacyClient`](../reference/spacy-client.md) and `client.publicClient` directly.
* **The default `gas` of `21_000` only works for native transfers.** Override for any contract call. Underestimating gas causes the broadcast to revert at the RPC level — your `signAndSend` rejects.
* **The transaction is broadcast, not awaited.** `signAndSend` returns once the RPC has accepted the raw transaction. To wait for inclusion, use the SDK's `client.publicClient`:

```tsx
import { useSpacy } from '@spacy-computer/sdk'

const { client } = useSpacy()
const { txHash } = await signAndSend(req)
const receipt = await client.publicClient.waitForTransactionReceipt({ hash: txHash })
```

## Pairing with `useAttestation`

If you want the proof status (IPFS pin, on-chain pointer) to update inline after the broadcast, hand the slug to `useAttestation`:

```tsx
const { signAndSend, lastResult } = useSign()
const { proof } = useAttestation(lastResult?.attestationSlug)

return (
  <>
    <button onClick={() => signAndSend(req)}>Send</button>
    {proof && <span>Proof: {proof.status}</span>}
  </>
)
```

See [Render a proof page](proof-page.md) for a fuller version.

## Errors you may see

| Message | Why |
|---|---|
| `wallet_not_ready` | `wallet` was `null` when you called `signAndSend`. Gate on `useWallet().wallet`. |
| `spacy_api_401` | Session expired during the call. Trigger `login()`. |
| `spacy_api_502` | KMS sign call failed upstream. Retry. |
| viem RPC errors (`insufficient funds`, `nonce too low`, …) | Standard EVM broadcast errors. Surface to the user. |

The full list lives at [Errors](../notes/errors.md).
