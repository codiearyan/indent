// Sends a few requests through your router with Hesper's middleware and one place for errors.
// Run with: node src/try.js
import { addRoute, createRouter, handle, onError, use } from './router.js'
import { ask } from './fake.js'
import { sendJson } from './send.js'
import { createShop, ShopError } from './shop.js'

const shop = createShop()
const STAFF_KEY = 'two-presses'
const log = []

const router = createRouter()

// Notes every request that reaches a route.
use(router, (req, res, next) => {
  log.push(`${req.method} ${req.url}`)
  next()
})

// Only staff change things: anything but GET needs the staff key.
use(router, (req, res, next) => {
  if (req.method !== 'GET' && req.headers['x-staff-key'] !== STAFF_KEY) {
    return sendJson(res, 401, { error: 'Only staff can change orders.' })
  }
  next()
})

try {
  onError(router, (error, req, res) => {
    if (error instanceof ShopError) sendJson(res, error.status, { error: error.message })
    else sendJson(res, 500, { error: 'Something went wrong on our side.' })
  })
} catch (error) {
  console.log(`onError() is task 2, and it threw ${error.message}. Errors are not answered yet.`)
}

addRoute(router, 'GET', '/orders/:id', (req, res) => {
  const order = shop.find(req.params.id)
  if (!order) throw new ShopError(404, `There is no order ${req.params.id}.`)
  sendJson(res, 200, order)
})
addRoute(router, 'POST', '/orders/:id/status', (req, res) => {
  sendJson(res, 200, shop.setStatus(req.params.id, req.body?.status))
})
// Sefton's draft: it forgets to answer.
addRoute(router, 'GET', '/orders/:id/proof', (req, res) => {
  shop.find(req.params.id)
})

const staff = { 'content-type': 'application/json', 'x-staff-key': STAFF_KEY }
const requests = [
  ['GET', '/orders/1875'],
  ['GET', '/orders/1999'],
  ['POST', '/orders/1874/status', { headers: { 'content-type': 'application/json' }, body: '{"status":"printing"}' }],
  ['POST', '/orders/1874/status', { headers: staff, body: '{"status":"printing"}' }],
  ['POST', '/orders/1874/status', { headers: staff, body: '{"status":"lost"}' }],
  ['GET', '/orders/1873/proof']
]

for (const [method, url, options] of requests) {
  try {
    console.log(await ask((req, res) => handle(router, req, res), method, url, options))
  } catch (error) {
    console.log(`${method} ${url} -> handle() threw ${error}`)
  }
}
console.log('The log:', log)
