// Run with: node try.js
// Starts the API on a free port, tries a few sign-ins, prints what came back, then stops.
import { createApp } from './src/app.js'

const requests = [
  {
    method: 'POST',
    path: '/sign-in',
    json: { email: 'kofi@kilnworth.example', password: 'centre-the-clay' }
  },
  {
    method: 'POST',
    path: '/sign-in',
    json: { email: 'kofi@kilnworth.example', password: 'centre-the-cla' }
  },
  {
    method: 'POST',
    path: '/sign-in',
    json: { email: 'nobody@kilnworth.example', password: 'centre-the-clay' }
  },
  { method: 'POST', path: '/sign-in', json: { email: 'kofi@kilnworth.example' } },
  { path: '/workshops/5' }
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
  for (const { method = 'GET', path, json } of requests) {
    const init = { method, headers: {} }
    if (json !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      console.log(`${method} ${path} ${json ? JSON.stringify(json) : ''}`)
      console.log(`  -> ${res.status} ${(await res.text()).slice(0, 200)}\n`)
    } catch (err) {
      console.log(`${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
