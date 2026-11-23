// Writes a few values back as JSON text with your stringify(). Run with: node src/try.js
import { stringify } from './json.js'

const item = { code: 'KR-120', name: 'Kraft "natural", 120 gsm', sizes: ['A3', 'A4'], price: 0.21, inStock: true }

const show = (label, write) => {
  try {
    console.log(`${label}:\n${write()}\n`)
  } catch (error) {
    console.log(`${label}:\n  ${error.name}: ${error.message}\n`)
  }
}

show('An item, compact', () => stringify(item))
show('The same item, indented by two', () => stringify(item, 2))
show('A note over two lines', () => stringify({ note: 'Ships by road only.\nNot by post.' }))
show('A price nobody worked out', () => stringify({ items: [{ code: 'INK-BLK', price: 0 / 0 }] }))
const order = { code: 'EV-C6' }
order.again = order
show('An order that holds itself', () => stringify(order))
