// Copied into the sandbox as .grader/drive.mjs. Renders cards with the learner's
// renderOrderCard() and reads them the way a browser would.
import { renderOrderCard } from '../src/orderCard.js'
import { readCard } from '../src/staffScreen.js'

export function cards(orders) {
  return orders.map((order) => {
    try {
      const html = renderOrderCard(order)
      return { html, seen: readCard(String(html)) }
    } catch (err) {
      return { error: `${err.name}: ${err.message}` }
    }
  })
}
