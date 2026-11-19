import './styles/globals.css'
import './stores/settings'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

document.documentElement.classList.add(`platform-${window.electron.process.platform}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
