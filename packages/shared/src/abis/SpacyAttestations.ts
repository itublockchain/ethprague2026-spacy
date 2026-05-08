/**
 * Hand-maintained ABI for `SpacyAttestations.sol`. Kept in TypeScript so it
 * carries const-narrow types into viem's `getContract` / `writeContract`
 * without a JSON import dance. Regenerate from Foundry output if the
 * contract surface changes (`forge build` then copy from
 * `packages/contracts/out/SpacyAttestations.sol/SpacyAttestations.json`).
 */
export const spacyAttestationsAbi = [
  {
    type: 'event',
    name: 'AttestationPublished',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'txHash', type: 'bytes32', indexed: true },
      { name: 'ipfsCid', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'publish',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'txHash', type: 'bytes32' },
      { name: 'ipfsCid', type: 'string' },
    ],
    outputs: [],
  },
] as const

export type SpacyAttestationsAbi = typeof spacyAttestationsAbi
