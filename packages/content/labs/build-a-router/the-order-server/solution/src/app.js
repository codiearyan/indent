// The order server, on Ashgrove's own router. It replaces Sefton's chain of ifs in old-server.js.
//
// Task 3: Move the order server onto your router (createApp)
import { addRoute, createRouter, mount, onError, use } from './router.js'
import { sendJson } from './send.js'
import { ShopError } from './shop.js'

export function createApp(shop, { staffKey }) {
  const app = createRouter()

  onError(app, (error, req, res) => {
    if (error instanceof ShopError) sendJson(res, error.status, { error: error.message })
    else sendJson(res, 500, { error: 'Something went wrong on our side.' })
  })

  addRoute(app, 'GET', '/prices', (req, res) => sendJson(res, 200, shop.prices()))
  addRoute(app, 'GET', '/orders', (req, res) => {
    const items = [req.query.item ?? []].flat()
    const orders = shop.list({ status: req.query.status })
    sendJson(res, 200, orders.filter((order) => items.length === 0 || items.includes(order.item)))
  })
  addRoute(app, 'GET', '/orders/today', (req, res) => sendJson(res, 200, shop.today()))
  addRoute(app, 'GET', '/orders/:id', (req, res) => {
    const order = shop.find(req.params.id)
    if (!order) throw new ShopError(404, `There is no order ${req.params.id}.`)
    sendJson(res, 200, order)
  })
  addRoute(app, 'POST', '/orders', (req, res) => sendJson(res, 201, shop.add(req.body)))

  const staff = createRouter()
  use(staff, (req, res, next) => {
    if (req.headers['x-staff-key'] !== staffKey) {
      return sendJson(res, 401, { error: 'Only staff can do that.' })
    }
    next()
  })
  addRoute(staff, 'GET', '/queue', (req, res) => sendJson(res, 200, shop.queue()))
  addRoute(staff, 'POST', '/orders/:id/status', (req, res) => {
    sendJson(res, 200, shop.setStatus(req.params.id, req.body?.status))
  })
  mount(app, '/staff', staff)

  return app
}
