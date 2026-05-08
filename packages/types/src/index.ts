export type Hex = `0x${string}`

export interface AttestationReceipt {
  txHash: Hex
  block: number
  network: 'sepolia' | 'base-sepolia'
  signers: Array<{
    nodeId: 'A' | 'B' | 'C'
    vendor: string
    jurisdiction: string
    quoteId: string
  }>
  cosmicEntropy: {
    hash: Hex
    satelliteSignature: Hex
    timestamp: number
  }
}

export type SendState =
  | { status: 'idle' }
  | { status: 'authorizing' }
  | { status: 'orbital-signing' }
  | { status: 'ground-signing' }
  | { status: 'broadcasting' }
  | { status: 'confirmed'; hash: Hex }
  | { status: 'failed'; error: string }
