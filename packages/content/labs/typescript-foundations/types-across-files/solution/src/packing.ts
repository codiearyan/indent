// The packing slip. Run it with: node src/packing.ts
// Check the types of all three files with: npm run types
//
// Packing and shipping each kept their own copy of the type of an order, and the copies drifted
// apart. From now on the type lives in one file, order.ts, and the other two import it.
//
// 1. One type for an order, written whole (order.ts)
// 2. Packing imports it (packing.ts)
// 3. Shipping imports it too (shipping.ts)

// Task 2: Packing imports it
// This file still has its own copy of the type of an order. Take the copy out, and in its place
// import Order from order.ts as a type only, just below this comment. Leave packingSlip and the
// lines below it as they are. Like this:
// OK-2051: 3 x Hearth Assam, 375 g, express
import type { Order } from './order.ts'

export function packingSlip(order: Order): string {
  const speed = order.express ? 'express' : 'standard'
  return `${order.id}: ${order.tins} x ${order.blend}, ${order.grams} g, ${speed}`
}
const today: Order = { id: 'OK-2051', blend: 'Hearth Assam', tins: 3, grams: 375, express: true }
console.log(packingSlip(today))
