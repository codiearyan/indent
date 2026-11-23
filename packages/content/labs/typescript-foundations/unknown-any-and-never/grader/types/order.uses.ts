import { readOrder } from '../src/cafe.ts'

// Whatever JSON.parse made may be passed in
const fromText = readOrder(JSON.parse('{ "blend": "Hearth Assam", "tins": 4 }'))
const fromNumber = readOrder(42)
const fromNull = readOrder(null)
const fromNothing = readOrder(undefined)
const fromObject = readOrder({ blend: 'Hearth Assam', tins: 4 })
// What comes back is an order or null
if (fromText !== null) {
  const blend: string = fromText.blend
  const tins: number = fromText.tins
}
