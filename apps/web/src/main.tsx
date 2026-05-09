import { PrivyProvider } from '@privy-io/react-auth'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { privyConfig } from './lib/privy'

const appId = import.meta.env.VITE_PRIVY_APP_ID
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element missing')

createRoot(rootEl).render(
  <StrictMode>
    <PrivyProvider appId={appId} config={privyConfig}>
      <App />
    </PrivyProvider>
  </StrictMode>,
)
