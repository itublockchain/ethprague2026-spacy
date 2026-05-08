/**
 * End-to-end sign smoke test.
 *
 * - Mints a session cookie via mint-test-session
 * - Reads the wallet from the API
 * - Builds a real EIP-1559 unsigned tx with viem
 * - Hashes it → digest
 * - POSTs to /sign/digest
 * - Splices signature, broadcasts (or just verifies signing succeeded)
 *
 * Usage: bun apps/api/scripts/probe-sign.ts
 */

import {
  createPublicClient,
  http,
  keccak256,
  parseEther,
  parseSignature,
  serializeTransaction,
  type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'
import { signSession, SESSION_COOKIE_NAME } from '../src/lib/jwt'
import { prisma } from '../src/prisma/client'

const API_BASE = 'http://localhost:8080'

async function mintCookie() {
  const email = 'smoketest@spacy.local'
  const googleSub = `smoketest-stable-${email}`
  const user = await prisma.user.upsert({
    where: { googleSub },
    create: { googleSub, email, name: 'Smoke Test' },
    update: { lastLoginAt: new Date() },
    select: { id: true, email: true, googleSub: true },
  })
  const token = await signSession({
    userId: user.id,
    googleSub: user.googleSub,
    email: user.email,
  })
  return `${SESSION_COOKIE_NAME}=${token}`
}

async function main() {
  const cookie = await mintCookie()

  // 1. fetch wallet
  const wRes = await fetch(`${API_BASE}/wallet/me`, { headers: { cookie } })
  if (!wRes.ok) throw new Error(`wallet fetch failed ${wRes.status}`)
  const wallet = (await wRes.json()) as { address: string }
  console.log('wallet:', wallet.address)

  // 2. read chain state with public RPC
  const rpc =
    process.env.RPC_URL ?? 'https://ethereum-sepolia.publicnode.com'
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpc) })
  const account = wallet.address as Hex
  const [nonce, fees] = await Promise.all([
    publicClient.getTransactionCount({ address: account }),
    publicClient.estimateFeesPerGas(),
  ])
  console.log('nonce:', nonce, 'maxFeePerGas:', fees.maxFeePerGas.toString())

  // 3. build unsigned EIP-1559 tx — sending 0 wei to ourselves (cheap, no broadcast issues)
  const unsignedFields = {
    chainId: sepolia.id,
    nonce,
    to: account,
    value: parseEther('0'),
    data: '0x' as Hex,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    gas: 21_000n,
  }
  const unsigned = { ...unsignedFields, type: 'eip1559' as const }
  const digest = keccak256(serializeTransaction(unsigned))
  console.log('digest:', digest)

  // 4. POST /sign/digest
  const sRes = await fetch(`${API_BASE}/sign/digest`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      digest,
      txMetadata: {
        chainId: unsignedFields.chainId,
        nonce: unsignedFields.nonce,
        to: unsignedFields.to,
        value: unsignedFields.value.toString(),
        data: unsignedFields.data,
        maxFeePerGas: unsignedFields.maxFeePerGas.toString(),
        maxPriorityFeePerGas: unsignedFields.maxPriorityFeePerGas.toString(),
        gas: unsignedFields.gas.toString(),
      },
    }),
  })
  if (!sRes.ok) {
    console.error('sign failed:', sRes.status, await sRes.text())
    process.exit(1)
  }
  const { signature, slug } = (await sRes.json()) as { signature: Hex; slug: string }
  console.log('signature:', signature)
  console.log('slug:', slug)

  // 5. splice + recover for sanity (don't broadcast)
  const sig = parseSignature(signature)
  const signed = serializeTransaction(unsigned, sig)
  console.log('serialized signed tx (first 80 chars):', signed.slice(0, 80))

  // 6. poll proof for ~25s to watch async IPFS + onchain progression
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const pRes = await fetch(`${API_BASE}/proof/${slug}`)
    if (!pRes.ok) continue
    const proof = (await pRes.json()) as {
      status: string
      ipfsCid: string | null
      onchainTxHash: string | null
    }
    console.log(
      `[${i + 1}/8] status=${proof.status} cid=${proof.ipfsCid ?? '-'} onchainTx=${proof.onchainTxHash ?? '-'}`,
    )
    if (proof.status === 'complete') break
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
