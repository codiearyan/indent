// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
import { createApp } from './src/app.js'

const requests = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/boats' },
  { method: 'GET', path: '/canoes' },
  { method: 'DELETE', path: '/boats' }
]

const server = createApp()
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { method, path } of requests) {
    try {
      const res = await fetch(base + path, { method })
      const allow = res.headers.get('allow')
      console.log(`${method} ${path} -> ${res.status} ${res.headers.get('content-type') ?? ''}`)
      if (allow) console.log(`  allow: ${allow}`)
      console.log(`  ${(await res.text()).slice(0, 160)}\n`)
    } catch (err) {
      console.log(`${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
