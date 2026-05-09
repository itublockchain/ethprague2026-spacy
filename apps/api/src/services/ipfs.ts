import { env } from '../config/env'
import { IpfsError } from '../lib/errors'

export interface PinResult {
  cid: string
  size: number
  pinnedAt: string
}

export async function pinJson(payload: unknown, name: string): Promise<PinResult> {
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.PINATA_JWT}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: payload,
      pinataMetadata: { name },
    }),
  })

  if (!res.ok) {
    throw new IpfsError(await res.text(), `pinata_${res.status}`)
  }

  const json = (await res.json()) as {
    IpfsHash: string
    PinSize: number
    Timestamp: string
  }

  return {
    cid: json.IpfsHash,
    size: json.PinSize,
    pinnedAt: json.Timestamp,
  }
}

export function gatewayUrl(cid: string): string {
  return `${env.PINATA_GATEWAY.replace(/\/$/, '')}/ipfs/${cid}`
}
