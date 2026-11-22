// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
import { createApp } from './src/app.js'

const requests = [
  { path: '/workshops/3' },
  { path: '/workshops/42' },
  { path: '/workshops/glazing' },
  { path: '/workshops?day=thu' },
  { path: '/workshops?day=thu&maxPriceCents=4000' },
  { path: '/workshops?maxPriceCents=lots' }
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
  for (const { method = 'GET', path, json, body, headers = {} } of requests) {
    const init = { method, headers: { ...headers } }
    if (json !== undefined || body !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = body ?? JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      console.log(`${method} ${path} -> ${res.status} ${res.headers.get('content-type') ?? ''}`)
      if (res.headers.get('location')) console.log(`  location: ${res.headers.get('location')}`)
      console.log(`  ${(await res.text()).slice(0, 200)}\n`)
    } catch (err) {
      console.log(`${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
