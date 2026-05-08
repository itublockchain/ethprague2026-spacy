import { OrbitportSDK } from '@spacecomputer-io/orbitport-sdk-ts'
import { env } from '../src/config/env'

const sdk = new OrbitportSDK({
  config: {
    clientId: env.ORBITPORT_CLIENT_ID,
    clientSecret: env.ORBITPORT_CLIENT_SECRET,
    apiUrl: env.ORBITPORT_BASE_URL,
    authDomain: new URL(env.ORBITPORT_AUTH_URL).host,
  },
})

async function main() {
  const token = await sdk.auth.getValidToken()
  if (!token) throw new Error('no_token')

  // 1. probe getCapabilities (read-only) to confirm auth
  const cap = await fetch(`${env.ORBITPORT_BASE_URL}/api/v1/rpc`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'kms.GetCapabilities', params: {} }),
  })
  console.log('GetCapabilities status:', cap.status)
  const capBody = await cap.text()
  console.log('GetCapabilities body (truncated):', capBody.slice(0, 800))

  // 2. probe createKey with our exact params
  const create = await fetch(`${env.ORBITPORT_BASE_URL}/api/v1/rpc`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'kms.CreateKey',
      params: {
        alias: `spacy-debug-${Date.now()}`,
        keySpec: 'ECC_SECG_P256K1',
        keyUsage: 'SIGN_VERIFY',
        scheme: 'ETHEREUM',
      },
    }),
  })
  console.log('CreateKey status:', create.status)
  console.log('CreateKey body:', await create.text())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
