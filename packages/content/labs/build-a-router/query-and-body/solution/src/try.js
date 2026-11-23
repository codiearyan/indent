// Sends a few requests with queries and bodies to the old server and to your router.
// Run with: node src/try.js
import { addRoute, createRouter, handle } from './router.js'
import { ask } from './fake.js'
import { oldServer } from './old-server.js'
import { sendJson } from './send.js'
import { createShop } from './shop.js'

const shop = createShop()
const json = { 'content-type': 'application/json' }
const requests = [
  ['GET', '/orders?status=waiting'],
  ['GET', '/orders?item=card&item=poster'],
  ['POST', '/orders', { headers: json, body: '{"item":"poster","quantity":30,"due":"2026-12-04"}' }],
  ['POST', '/orders', { headers: json, body: '{"item":"poster",' }],
  ['POST', '/orders', { headers: json, body: JSON.stringify({ item: 'card', quantity: 500, due: '2026-12-09', note: 'x'.repeat(3000) }) }]
]

console.log('The old server:')
const old = oldServer(shop)
for (const [method, url] of requests.slice(0, 2)) console.log(' ', await ask(old, method, url))

// A small limit, so the last request is too large.
const router = createRouter({ bodyLimit: 2000 })
addRoute(router, 'GET', '/orders', (req, res) => {
  const items = [req.query?.item ?? []].flat()
  const orders = shop.list({ status: req.query?.status })
  sendJson(res, 200, orders.filter((o) => items.length === 0 || items.includes(o.item)).map((o) => o.id))
})
addRoute(router, 'POST', '/orders', (req, res) => {
  try {
    sendJson(res, 201, shop.add(req.body))
  } catch (error) {
    sendJson(res, error.status ?? 500, { error: error.message })
  }
})

console.log('Your router:')
for (const [method, url, options] of requests) {
  console.log(' ', await ask((req, res) => handle(router, req, res), method, url, options))
}
