import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

// Load .env.local first (developer overrides), then .env. dotenv does not
// overwrite already-set vars, so .env.local wins. Resolved relative to the
// api package root so it works regardless of CWD when launched.
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
for (const name of ['.env.local', '.env']) {
  const path = resolve(apiRoot, name)
  if (existsSync(path)) loadEnv({ path })
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url(),
  WEB_BASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('spacy'),
  JWT_AUDIENCE: z.string().default('spacy-web'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  ORBITPORT_BASE_URL: z.string().url(),
  ORBITPORT_AUTH_URL: z.string().url(),
  ORBITPORT_CLIENT_ID: z.string().min(1),
  ORBITPORT_CLIENT_SECRET: z.string().min(1),

  PINATA_JWT: z.string().min(1),
  PINATA_GATEWAY: z.string().url().default('https://gateway.pinata.cloud'),
  TRUST_ANCHOR_BUNDLE_CID: z.string().min(1),
  CTRNG_IPFS_BEACON_URL: z
    .string()
    .url()
    .default('https://ipfs.io/ipns/k2k4r8lvomw737sajfnpav0dpeernugnryng50uheyk1k39lursmn09f'),
  VERIFY_INSTRUCTIONS_URL: z.string().url().default('https://spacy.computer/verify'),
  ATTESTATION_SPEC_URL: z.string().url().default('https://spacy.computer/spec/attestation/v1'),

  CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  RPC_URL: z.string().url(),
  ATTESTATION_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'invalid_contract_address'),
  RELAYER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'invalid_relayer_key'),

  SEV_GUEST_DEVICE: z.string().default('/dev/sev-guest'),
  SELF_ATTESTATION_REFRESH_HOURS: z.coerce.number().positive().default(12),
  MOCK_ATTESTATION: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .default('false'),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env: Env = parsed.data

export const isProd = env.NODE_ENV === 'production'
