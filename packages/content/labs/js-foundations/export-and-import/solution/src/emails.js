// Order emails. Run this file with: node src/emails.js
//
// Task 4: A line for the order email
import { formatPrice } from './money.js'

export function orderLine(candle, qty) {
  return `${qty} x ${candle.name}, ${formatPrice(candle.priceCents * qty)}`
}

console.log(orderLine({ name: 'Cedar', priceCents: 1800 }, 2))
