import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
// The studio's API runs on its own computer. Here a stand-in answers inside the page instead: see
// server/standIn.js, and server/settings.js to make it slow or make it fail.
import '../server/standIn.js'

// StrictMode checks the screen for mistakes while you develop it. One of its checks: it runs every
// effect, its cleanup, and the effect again when a component first appears.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
