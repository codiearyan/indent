// Run with: node src/demo.js
import { openDb } from './db.js'
import { getOrder, listOrders } from './orders.js'
import { reproduceOrderPeek } from './reproduce.js'

const db = openDb()
const greta = { customerId: 101 }
console.log("Greta's order list:", listOrders(db, greta))
console.log('\nGreta opens /orders/2041:', getOrder(db, greta, 2041))
console.log('Greta opens /orders/9999:', getOrder(db, greta, 9999))

console.log('\nreproduceOrderPeek():')
try {
  console.log(reproduceOrderPeek())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
