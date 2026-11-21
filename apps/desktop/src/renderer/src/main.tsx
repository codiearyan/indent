import './styles/globals.css'
import './stores/settings'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { track } from './lib/telemetry'

document.documentElement.classList.add(`platform-${window.platform}`)
track('app_opened')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
