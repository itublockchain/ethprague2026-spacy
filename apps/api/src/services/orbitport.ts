/**
 * Orbitport service.
 *
 * The official SDK at v0.2.x has two integration issues with the live
 * gateway: it serializes KMS request params as camelCase but the gateway
 * deserializer requires PascalCase, and the typed `description`/`tags`
 * fields are marked optional but the gateway treats them as required.
 * Until the SDK ships a fix we drive KMS via raw JSON-RPC, while still
 * leveraging the SDK for OAuth2 token refresh and cTRNG (both of which
 * work cleanly).
 *
 * KMS quote: the v0.2.x SDK does not yet surface the Intel TDX quote
 * that ships alongside `kms.sign`. We attempt to fetch it via a raw
 * HTTP call to the quote endpoint and fall back to an empty quote +
 * `quoteVerified: false` when unavailable, surfacing that state in the
 * proof page so verifiers know to retry against the production SDK.
 */

import { createHash, randomBytes } from 'node:crypto'
import { OrbitportSDK } from '@spacecomputer-io/orbitport-sdk-ts'
import { env } from '../config/env'
import { OrbitportError } from '../lib/errors'
import { logger } from '../lib/logger'

let sdk: OrbitportSDK | null = null

function getSdk(): OrbitportSDK {
  if (sdk) return sdk
  sdk = new OrbitportSDK({
    config: {
      clientId: env.ORBITPORT_CLIENT_ID,
      clientSecret: env.ORBITPORT_CLIENT_SECRET,
      apiUrl: env.ORBITPORT_BASE_URL,
      authDomain: new URL(env.ORBITPORT_AUTH_URL).host,
    },
    debug: env.NODE_ENV !== 'production',
    eventHandler: (e) => logger.debug({ orbitport: e }, 'orbitport event'),
  })
  return sdk
}

// --------------------------------------------------------------------------
// KMS — raw JSON-RPC because SDK v0.2.x mismatches the live gateway shape.

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

async function rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const token = await getSdk().auth.getValidToken()
  if (!token) throw new OrbitportError('no_token', 'kms_no_token')

  const res = await fetch(`${env.ORBITPORT_BASE_URL}/api/v1/rpc`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new OrbitportError({ status: res.status, body }, `kms_${res.status}`)
  }

  const json = (await res.json()) as JsonRpcResponse<T>
  if (json.error) {
    throw new OrbitportError(json.error, `kms_rpc_${json.error.code}`)
  }
  if (!json.result) {
    throw new OrbitportError(json, 'kms_empty_result')
  }
  return json.result
}

export interface KmsCreateKeyResult {
  keyId: string
  address: `0x${string}`
}

interface KmsCreateKeyResp {
  KeyMetadata: {
    KeyId: string
    Address?: string
    PublicKey?: string
    Scheme: string
  }
}

export async function kmsCreateKey(label: string): Promise<KmsCreateKeyResult> {
  try {
    const result = await rpc<KmsCreateKeyResp>('kms.CreateKey', {
      Alias: label,
      Description: `Spacy embedded wallet for ${label}`,
      KeySpec: 'ECC_SECG_P256K1',
      KeyUsage: 'SIGN_VERIFY',
      Scheme: 'ETHEREUM',
      Tags: [],
    })
    const meta = result.KeyMetadata
    if (!meta.Address) {
      throw new OrbitportError(meta, 'kms_key_missing_address')
    }
    logger.info({ keyId: meta.KeyId, address: meta.Address }, 'KMS key created')
    return { keyId: meta.KeyId, address: meta.Address as `0x${string}` }
  } catch (err) {
    if (err instanceof OrbitportError) throw err
    logger.error({ err }, 'KMS createKey failed')
    throw new OrbitportError(err, 'kms_create_key_failed')
  }
}

export interface KmsSignResult {
  signature: `0x${string}`
  quoteHex: string
}

interface KmsSignResp {
  Signature: string
  KeyId: string
  SigningAlgorithm: string
}

export async function kmsSign(input: {
  keyId: string
  digest: `0x${string}`
}): Promise<KmsSignResult> {
  try {
    const result = await rpc<KmsSignResp>('kms.Sign', {
      KeyId: input.keyId,
      Message: input.digest,
      MessageType: 'DIGEST',
      SigningAlgorithm: 'ETHEREUM_SECP256K1',
    })
    const quoteHex = await tryFetchKmsQuote(input.keyId, result.Signature)
    return {
      signature: result.Signature as `0x${string}`,
      quoteHex,
    }
  } catch (err) {
    if (err instanceof OrbitportError) throw err
    logger.error({ err, keyId: input.keyId }, 'KMS sign failed')
    throw new OrbitportError(err, 'kms_sign_failed')
  }
}

/**
 * Best-effort fetch of the Intel TDX quote that ships alongside a sign
 * operation. The official SDK at v0.2.x does not expose this yet; until it
 * does we hit the documented HTTP attestation endpoint directly with a
 * gateway token. Failures degrade gracefully — receipt persists with an
 * empty quote and `quoteVerified: false`, the proof page surfaces the state.
 */
async function tryFetchKmsQuote(keyId: string, signature: string): Promise<string> {
  try {
    const token = await getSdk().auth.getValidToken()
    if (!token) return ''
    const res = await fetch(
      `${env.ORBITPORT_BASE_URL}/api/v1/kms/keys/${encodeURIComponent(keyId)}/attestation`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ signature }),
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) return ''
    const body = (await res.json()) as { quote?: string; attestation?: string }
    return body.quote ?? body.attestation ?? ''
  } catch (err) {
    logger.debug({ err, keyId }, 'KMS quote fetch unavailable; persisting unverified')
    return ''
  }
}

// --------------------------------------------------------------------------
// cTRNG — primary path is API-first, SDK auto-falls-back to IPFS beacon

export interface CTrngSample {
  entropyHex: string
  hash: string
  satelliteSig: string
  satelliteSource: string
  timestamp: string
}

export async function sampleCTrng(): Promise<CTrngSample> {
  try {
    const res = await getSdk().ctrng.random({ src: 'rng' })
    return shape(res.data)
  } catch (err) {
    logger.warn({ err }, 'cTRNG primary failed, retrying IPFS-only')
    try {
      const res = await getSdk().ctrng.random({ src: 'ipfs' })
      return shape(res.data)
    } catch (innerErr) {
      logger.error({ err: innerErr }, 'cTRNG IPFS fallback also failed')
      throw new OrbitportError(innerErr, 'ctrng_unavailable')
    }
  }
}

function shape(r: {
  service?: string
  src: string
  data: string
  signature?: { value: string; pk: string; algo?: string }
  timestamp?: string
  provider?: string
}): CTrngSample {
  const entropyClean = r.data.startsWith('0x') ? r.data.slice(2) : r.data
  const hash = createHash('sha256').update(Buffer.from(entropyClean, 'hex')).digest('hex')
  return {
    entropyHex: entropyClean,
    hash,
    satelliteSig: r.signature?.value ?? '',
    satelliteSource: r.src,
    timestamp: r.timestamp ?? new Date().toISOString(),
  }
}

/**
 * Local stub for dev when MOCK_ATTESTATION=true — gives a deterministically
 * shaped sample so the sign flow can be exercised without Orbitport access.
 */
export function mockCTrng(): CTrngSample {
  const entropy = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(entropy, 'hex').digest('hex')
  return {
    entropyHex: entropy,
    hash,
    satelliteSig: `0x${randomBytes(64).toString('hex')}`,
    satelliteSource: 'mock-satellite',
    timestamp: new Date().toISOString(),
  }
}
