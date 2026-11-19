// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
import { createApp } from './src/app.js'

const requests = [
  { method: 'POST', path: '/quotes', body: '{ "type": "double", "hours": 3 }' },
  { method: 'POST', path: '/quotes', body: '{ "type": "double", "hours": ' },
  { method: 'POST', path: '/quotes', body: '{ "type": "canoe", "hours": "3" }' },
  { method: 'POST', path: '/quotes', body: JSON.stringify({ note: 'x'.repeat(20_000) }) }
]

const server = createApp()
server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { method, path, body } of requests) {
    const shown = body.length > 40 ? `${body.slice(0, 40)}... (${body.length} chars)` : body
    try {
      const res = await fetch(base + path, {
        method,
        body,
        headers: { 'content-type': 'application/json' }
      })
      console.log(`${method} ${path} ${shown}\n  -> ${res.status} ${(await res.text()).slice(0, 200)}\n`)
    } catch (err) {
      console.log(`${method} ${path} ${shown}\n  -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
