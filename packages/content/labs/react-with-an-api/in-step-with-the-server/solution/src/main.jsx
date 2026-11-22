import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
// The studio's API runs on its own computer. Here a stand-in answers inside the page instead: see
// server/standIn.js, and server/settings.js to make it slow or make it fail.
import '../server/standIn.js'

createRoot(document.getElementById('root')).render(<App />)
