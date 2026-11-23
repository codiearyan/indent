import { readOrder } from '../src/cafe.ts'

const order = readOrder({ blend: 'Hearth Assam', tins: 4 })
// @ts-expect-error: the result may be null, so it is checked before it is read
order.blend
// @ts-expect-error: an order has no grams
const grams = order?.grams
