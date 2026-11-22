import { lineGrams } from '../src/orders.ts'

// @ts-expect-error: an order line without its grams per tin is refused
lineGrams({ tins: 2 })
// @ts-expect-error: tins written as text are refused
lineGrams({ tins: '2', gramsPerTin: 125 })
// @ts-expect-error: a number on its own is not an order line
lineGrams(250)
// @ts-expect-error: a weight is a number, so it is not text
const asText: string = lineGrams({ tins: 2, gramsPerTin: 125 })
