// Task 1: catch a receipt that does not add up.
//
// Pick an order (the one from the ticket in orders.js works) and run it through the original
// receipt(). Return { lines, discountPercent, shown, correct }:
// - shown: exactly what receipt(lines, discountPercent) returned
// - correct: the receipt you worked out by hand for the same order, in the same shape
// `node src/demo.js` prints what this function returns.
import { receipt } from './receipt.js'
import { ticketOrder } from './orders.js'

export function reproduceCentDrift() {
  const { lines, discountPercent } = ticketOrder
  return {
    lines,
    discountPercent,
    shown: receipt(lines, discountPercent),
    correct: { subtotal: '42.65', discount: '4.27', total: '38.38' }
  }
}
