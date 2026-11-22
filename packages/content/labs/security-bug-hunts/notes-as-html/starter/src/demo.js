// Run with: node src/demo.js
import { openDb } from './db.js'
import { renderOrderCard } from './orderCard.js'
import { readCard } from './staffScreen.js'
import { reproduceNoteMarkup } from './reproduce.js'

const db = openDb()
const order = db
  .prepare(
    `SELECT o.id, o.title, o.status, o.note, c.name AS customerName
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
  )
  .get(2046)

console.log('Order 2046 as stored:', { ...order })
console.log('\nThe card:\n' + renderOrderCard(order))
console.log('\nWhat the staff board shows:', readCard(renderOrderCard(order)))

console.log('\nreproduceNoteMarkup():')
try {
  const { order: yours, html } = reproduceNoteMarkup()
  console.log({ order: yours, html })
  console.log('What the staff board shows:', readCard(html))
} catch (err) {
  console.log(`Error: ${err.message}`)
}
