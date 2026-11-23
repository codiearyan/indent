// Sefton's order screen as it is today, drawn as text. Each part keeps its own copy of what it
// shows, and every change has to remember to update every copy.
import { pounds, PRICES, totalOf } from './order.js'

export function oldScreen(order) {
  const header = { count: order.basket.length }
  const basket = { lines: [...order.basket] }
  const total = { pence: totalOf(order.basket) }
  const paper = { kind: order.paper }

  return {
    add(item, quantity) {
      basket.lines.push({ item, quantity })
      total.pence += quantity * PRICES[item]
    },
    remove(item) {
      basket.lines = basket.lines.filter((line) => line.item !== item)
      header.count -= 1
    },
    choosePaper(kind) {
      paper.kind = kind
    },
    draw() {
      return [
        `  Basket (${header.count})`,
        ...basket.lines.map((line) => `    ${line.quantity} x ${line.item}`),
        `  Paper: ${paper.kind}`,
        `  Total: ${pounds(total.pence)}`
      ].join('\n')
    }
  }
}
