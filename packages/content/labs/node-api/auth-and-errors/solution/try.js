// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
// The last request goes to a second app whose store is broken on purpose.
import { createApp } from './src/app.js'
import { fleet } from './src/fleet.js'
import { createBoatStore } from './src/store.js'

const kestrel = { code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900 }
const staff = { authorization: 'Bearer dock-staff-7f3a' }
const viewer = { authorization: 'Bearer front-desk-21c9' }

const requests = [
  { path: '/boats/TW-02', headers: { 'x-request-id': 'booking-page-42' } },
  { method: 'POST', path: '/boats', body: kestrel },
  { method: 'POST', path: '/boats', body: kestrel, headers: viewer },
  { method: 'POST', path: '/boats', body: kestrel, headers: staff },
  { path: '/boats?limit=0' }
]

const brokenStore = createBoatStore(fleet)
brokenStore.list = () => {
  throw new Error('ENOSPC: no space left on /var/lib/larchmere/boats.db')
}

async function send(app, { method = 'GET', path, body, headers = {} }) {
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve))
  const who = headers.authorization ? ` as ${headers.authorization}` : ''
  try {
    const res = await fetch(`http://127.0.0.1:${app.address().port}${path}`, {
      method,
      headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
      body: body && JSON.stringify(body)
    })
    const extra = ['x-request-id', 'www-authenticate']
      .filter((h) => res.headers.has(h))
      .map((h) => `\n  ${h}: ${res.headers.get(h)}`)
      .join('')
    console.log(`${method} ${path}${who}\n  -> ${res.status}${extra}\n  ${(await res.text()).slice(0, 200)}\n`)
  } catch (err) {
    console.log(`${method} ${path}${who}\n  -> failed: ${err.cause?.message ?? err.message}\n`)
  }
  app.closeAllConnections()
  await new Promise((resolve) => app.close(resolve))
}

const app = createApp()
for (const request of requests) await send(app, request)
console.log('With a broken store:')
await send(createApp({ store: brokenStore, log: (...args) => console.log('  [log]', ...args) }), { path: '/boats' })
