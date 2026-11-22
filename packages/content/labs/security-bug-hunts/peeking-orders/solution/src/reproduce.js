// Task 1: catch a customer reading someone else's order (ticket LL-19).
//
// Sign in as one customer (a session is { customerId }, with an id from seed.js) and ask the
// original getOrder() for an order that belongs to another customer, with a fresh openDb().
// Return { session, orderId, shown }:
// - shown: exactly what getOrder(db, session, orderId) returned
// `node src/demo.js` prints what this function returns.
import { openDb } from './db.js'
import { getOrder } from './orders.js'

export function reproduceOrderPeek() {
  const session = { customerId: 102 }
  const orderId = 2041
  return { session, orderId, shown: getOrder(openDb(), session, orderId) }
}
