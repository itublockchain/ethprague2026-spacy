import { SpacyProvider } from '@spacy/sdk'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const apiBaseUrl = import.meta.env.VITE_SPACY_API_URL ?? 'http://localhost:8080'
const chainId = Number(import.meta.env.VITE_SPACY_CHAIN_ID ?? '11155111')

const root = document.getElementById('root')
if (!root) throw new Error('root element missing')

createRoot(root).render(
  <StrictMode>
    <SpacyProvider config={{ apiBaseUrl, chainId }}>
      <App />
    </SpacyProvider>
  </StrictMode>,
)
