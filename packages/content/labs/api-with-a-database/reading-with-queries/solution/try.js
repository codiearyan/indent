// Run with: node try.js
// Starts the API on the studio's database file, sends a few reads, prints what came back, then
// stops. Changing workshops comes in the next issue.
import { createApp } from './src/app.js'

const requests = [
  { path: '/workshops' },
  { path: '/workshops/4' },
  { path: '/workshops/40' },
  { path: '/workshops?day=thu' },
  { path: '/workshops?day=thu&maxPriceCents=4000' }
]

let app
try {
  app = createApp()
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { path } of requests) {
    try {
      const res = await fetch(base + path)
      console.log(`GET ${path} -> ${res.status}`)
      console.log(`  ${(await res.text()).slice(0, 300)}\n`)
    } catch (err) {
      console.log(`GET ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
