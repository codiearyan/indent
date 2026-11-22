// Task 1: catch a note that turns into HTML (ticket LL-15).
//
// Make an order whose title, customer name or note holds text the browser reads as HTML, and run
// it through the original renderOrderCard(). Return { order, html }:
// - order: { id, title, status, customerName, note }
// - html: exactly what renderOrderCard(order) returned
// `node src/demo.js` prints what this function returns, and what the staff board would show.
import { renderOrderCard } from './orderCard.js'

export function reproduceNoteMarkup() {
  const order = {
    id: 2046,
    title: 'Gig posters',
    status: 'proof sent',
    customerName: 'Yusra Penhallow',
    note: 'Size A2 <not A3>.'
  }
  return { order, html: renderOrderCard(order) }
}
