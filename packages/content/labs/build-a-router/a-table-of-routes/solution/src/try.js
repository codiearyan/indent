// Sends a few requests to the old server and to your router, and prints what comes back.
// Run with: node src/try.js
import { addRoute, createRouter, handle } from './router.js'
import { ask } from './fake.js'
import { oldServer } from './old-server.js'
import { sendJson } from './send.js'
import { createShop } from './shop.js'

const shop = createShop()
const requests = [
  ['GET', '/prices'],
  ['GET', '/orders/today'],
  ['GET', '/orders/todays-list'],
  ['GET', '/Prices'],
  ['DELETE', '/prices']
]

console.log('The old server:')
const old = oldServer(shop)
for (const [method, url] of requests) console.log(' ', await ask(old, method, url))

const router = createRouter()
addRoute(router, 'GET', '/prices', (req, res) => sendJson(res, 200, shop.prices()))
addRoute(router, 'GET', '/orders', (req, res) => sendJson(res, 200, shop.list()))
addRoute(router, 'GET', '/orders/today', (req, res) => sendJson(res, 200, shop.today()))
addRoute(router, 'PUT', '/prices', (req, res) => sendJson(res, 200, { note: 'Hesper sets the prices.' }))

console.log('Your router:')
for (const [method, url] of requests) {
  console.log(' ', await ask((req, res) => handle(router, req, res), method, url))
}
