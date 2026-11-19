// Copied into the sandbox as .grader/drive.mjs. Runs the learner's receipt() on many orders.
import { receipt } from '../src/receipt.js'

const PRICES = [18.15, 24.5, 12.35, 9.95, 4.1, 0.15, 32.45, 1.15, 16.05, 0.1, 0.7, 199.99]
const PERCENTS = [0, 10, 15, 30]

function gridOrders() {
  const orders = []
  for (const a of PRICES) {
    for (const b of PRICES) {
      for (const percent of PERCENTS) {
        orders.push({ lines: [{ price: a, qty: 2 }, { price: b, qty: 1 }], discountPercent: percent })
      }
    }
  }
  return orders
}

export function grid() {
  const orders = gridOrders()
  return { orders, receipts: orders.map((order) => receipt(order.lines, order.discountPercent)) }
}
