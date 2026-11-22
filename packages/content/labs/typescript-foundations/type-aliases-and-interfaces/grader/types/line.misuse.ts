import { lineGrams, lineLabel, type Line } from '../src/orders.ts'

// @ts-expect-error: a Line without its grams per tin is refused
const short: Line = { blend: 'Morning Keemun', tins: 2 }
// @ts-expect-error: tins written as text are refused
const wordy: Line = { blend: 'Morning Keemun', tins: 'two', gramsPerTin: 250 }
// @ts-expect-error: lineLabel refuses a line without its grams per tin
lineLabel({ blend: 'Morning Keemun', tins: 2 })
// @ts-expect-error: lineGrams refuses a line without its blend
lineGrams({ tins: 2, gramsPerTin: 250 })
