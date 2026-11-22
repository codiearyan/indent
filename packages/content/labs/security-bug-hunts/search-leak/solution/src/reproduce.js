// Task 1: catch the search showing orders that are not the customer's (ticket LL-12).
//
// Pick a customer id from seed.js and a search text that changes the query instead of being
// searched for. Run them through the original searchOrders() with a fresh openDb().
// Return { customerId, text, shown }:
// - shown: exactly what searchOrders(db, customerId, text) returned
// `node src/demo.js` prints what this function returns.
import { openDb } from './db.js'
import { searchOrders } from './search.js'

export function reproduceSearchLeak() {
  const customerId = 101
  const text = "' OR 1=1 --"
  return { customerId, text, shown: searchOrders(openDb(), customerId, text) }
}
