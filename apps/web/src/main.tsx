import { SpacyProvider } from '@spacy-computer/sdk'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { SEPOLIA_CHAIN_ID } from './lib/constants'

const apiBaseUrl = import.meta.env.VITE_SPACY_API_URL ?? 'http://localhost:8080'
const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element missing')

createRoot(rootEl).render(
  <StrictMode>
    <SpacyProvider
      config={{
        apiBaseUrl,
        chainId: SEPOLIA_CHAIN_ID,
        ...(rpcUrl ? { rpcUrl } : {}),
      }}
    >
      <App />
    </SpacyProvider>
  </StrictMode>,
)
