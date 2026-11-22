// Task 1: catch a note that turns into HTML (ticket AP-15).
//
// Make an order whose title, customer name or note holds text the browser reads as HTML, and run
// it through the original renderOrderCard(). Return { order, html }:
// - order: { id, title, status, customerName, note }
// - html: exactly what renderOrderCard(order) returned
// `node src/demo.js` prints what this function returns, and what the staff board would show.
import { renderOrderCard } from './orderCard.js'

export function reproduceNoteMarkup() {
  throw new Error('Not implemented')
}
