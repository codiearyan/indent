// Starts the order server on your router, on a port the system picks, sends it real requests and
// prints what comes back. Run with: node src/try.js
import { createApp } from './app.js'
import { serve } from './router.js'
import { createShop } from './shop.js'

const STAFF_KEY = 'two-presses'
const server = serve(createApp(createShop(), { staffKey: STAFF_KEY }))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
console.log(`Listening on ${base}`)

const json = { 'content-type': 'application/json' }
const requests = [
  ['GET', '/orders/today'],
  ['GET', '/orders?status=waiting&item=card'],
  ['DELETE', '/prices'],
  ['GET', '/orders/todays-list'],
  ['POST', '/orders', json, '{"item":"invite","quantity":80,"due":"2026-12-12"}'],
  ['GET', '/staff/queue'],
  ['POST', '/staff/orders/1874/status', { ...json, 'x-staff-key': STAFF_KEY }, '{"status":"printing"}'],
  ['HEAD', '/prices']
]

try {
  for (const [method, path, headers, body] of requests) {
    const res = await fetch(base + path, { method, headers, body })
    const text = await res.text()
    const allow = res.headers.get('allow') ? ` (allow: ${res.headers.get('allow')})` : ''
    console.log(`${method} ${path} -> ${res.status}${allow} ${text.length > 72 ? `${text.slice(0, 69)}...` : text}`)
  }
} finally {
  server.close()
  server.closeAllConnections()
}
