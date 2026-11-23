// The shipping for an order, in pence. Run it with: node src/shipping.ts
// Check the types of all three files with: npm run types
//
// Packing and shipping each kept their own copy of the type of an order, and the copies drifted
// apart. From now on the type lives in one file, order.ts, and the other two import it.
//
// 1. One type for an order, written whole (order.ts)
// 2. Packing imports it (packing.ts)
// 3. Shipping imports it too (shipping.ts)

// Task 3: Shipping imports it too
// Rafe began moving this file to order.ts: he took out its copy of the type, which called the
// weight of an order weight, and imported Order. Now node src/shipping.ts stops before it runs a
// line, and once order.ts has its Order, npm run types refuses two lines here. Make the import
// one that Node can run, then fix the line the shared type shows to be wrong. Leave the prices
// as they are. Like this:
// OK-2052: 295
// OK-2053: 700
import type { Order } from './order.ts'

export function shippingFor(order: Order): number {
  const pence = order.grams <= 500 ? 295 : order.grams <= 2000 ? 450 : 695
  return order.express ? pence + 250 : pence
}
const small: Order = { id: 'OK-2052', blend: 'Frost Sencha', tins: 2, grams: 100, express: false }
const big: Order = { id: 'OK-2053', blend: 'Ember Oolong', tins: 9, grams: 1125, express: true }
console.log(`${small.id}: ${shippingFor(small)}`)
console.log(`${big.id}: ${shippingFor(big)}`)
