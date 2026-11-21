// Run with: node src/demo.js
import { receipt } from './receipt.js'
import { reproduceCentDrift } from './reproduce.js'
import { groupOrder, lockerOrder, ticketOrder } from './orders.js'

for (const [label, order] of Object.entries({ ticketOrder, lockerOrder, groupOrder })) {
  console.log(`${label}:`, receipt(order.lines, order.discountPercent))
}

console.log('\nreproduceCentDrift():')
try {
  console.log(reproduceCentDrift())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
