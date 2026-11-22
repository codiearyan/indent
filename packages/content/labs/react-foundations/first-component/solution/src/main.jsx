// Task 1: put App on the screen, inside the element with the id root in index.html.
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
