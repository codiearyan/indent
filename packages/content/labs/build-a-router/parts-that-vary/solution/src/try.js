// Sends a few requests about single orders to the old server and to your router.
// Run with: node src/try.js
import { addRoute, createRouter, handle } from './router.js'
import { ask } from './fake.js'
import { oldServer } from './old-server.js'
import { sendJson } from './send.js'
import { createShop } from './shop.js'

const shop = createShop()
const requests = [
  ['GET', '/orders/1873'],
  ['GET', '/orders/today'],
  ['GET', '/orders/1873/proof'],
  ['GET', '/orders/'],
  ['GET', '/prices/poster'],
  ['GET', '/orders/18%7'],
  ['PUT', '/orders/1874']
]

console.log('The old server:')
const old = oldServer(shop)
for (const [method, url] of requests) console.log(' ', await ask(old, method, url))

const router = createRouter()
addRoute(router, 'GET', '/orders/:id', (req, res) => {
  const order = shop.find(req.params?.id)
  if (order) sendJson(res, 200, order)
  else sendJson(res, 404, { error: `There is no order ${req.params?.id}.` })
})
addRoute(router, 'GET', '/orders/today', (req, res) => sendJson(res, 200, shop.today()))
addRoute(router, 'GET', '/orders/:id/proof', (req, res) => {
  sendJson(res, 200, { order: req.params?.id, proof: 'Sefton sends proofs by post.' })
})
addRoute(router, 'GET', '/prices/:item', (req, res) => {
  sendJson(res, 200, { item: req.params?.item, pence: shop.prices()[req.params?.item] })
})
addRoute(router, 'DELETE', '/orders/:id', (req, res) => sendJson(res, 403, { error: 'Only Hesper cancels.' }))

console.log('Your router:')
for (const [method, url] of requests) {
  console.log(' ', await ask((req, res) => handle(router, req, res), method, url))
}
