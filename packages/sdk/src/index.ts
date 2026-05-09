export type { Hex } from 'viem'
export type {
  SignRequest,
  SignResult,
  SpacyClientConfig,
  WalletInfo,
} from './client'
export { SpacyClient } from './client'
export { useAttestation } from './hooks/useAttestation'
export { useSign } from './hooks/useSign'
export { useWallet } from './hooks/useWallet'
export { SpacyProvider, useSpacy } from './provider'

/**
 * UI transition states for the orbital sign theatre. Hook-state, not
 * coordinator-state — the actual signing path is `signAndSend` in the
 * client. The `confirmed`/`failed` shapes carry the data the UI needs
 * to render the receipt link without another round trip.
 */
export type SendState =
  | { status: 'idle' }
  | { status: 'authorizing' }
  | { status: 'orbital-signing' }
  | { status: 'ground-signing' }
  | { status: 'broadcasting' }
  | { status: 'confirmed'; hash: `0x${string}`; attestationSlug?: string }
  | { status: 'failed'; error: string }
