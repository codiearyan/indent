import { lineGrams } from '../src/orders.ts'

// An order line with tins and grams per tin gives a weight
const grams: number = lineGrams({ tins: 2, gramsPerTin: 125 })
// A whole order line, with a blend as well, can be weighed too
const line = { blend: 'Smoky Lapsang', tins: 4, gramsPerTin: 50 }
const heavier: number = lineGrams(line)
