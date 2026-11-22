// The order server, on Ashgrove's own router. It replaces Sefton's chain of ifs in old-server.js.
//
// Task 3: Move the order server onto your router (createApp)
import { addRoute, createRouter, mount, onError, use } from './router.js'
import { sendJson } from './send.js'
import { ShopError } from './shop.js'

// createApp(shop, { staffKey }) returns a router that answers every request of the order page:
//
//   GET  /prices          200 with shop.prices()
//   GET  /orders          200 with shop.list(), keeping only the orders whose status is
//                         req.query.status and whose item is one of req.query.item, when given
//   GET  /orders/today    200 with shop.today()
//   GET  /orders/:id      200 with shop.find(id), or 404 with { error } when there is no such order
//   POST /orders          201 with shop.add(req.body)
//
// and, in a group under /staff whose middleware answers 401 with { error } unless the request's
// x-staff-key header is staffKey:
//
//   GET  /staff/queue               200 with shop.queue()
//   POST /staff/orders/:id/status   200 with shop.setStatus(id, req.body.status)
//
// One error handler answers a ShopError with its status and { error: its message }, and anything
// else with a plain 500.
export function createApp(shop, { staffKey }) {
  throw new Error('Not implemented')
}
