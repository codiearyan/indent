import { lineGrams, lineLabel, type Line } from '../src/orders.ts'

// A Line has a blend, tins and grams per tin, and both functions take one
const line: Line = { blend: 'Morning Keemun', tins: 2, gramsPerTin: 250 }
const grams: number = lineGrams(line)
const label: string = lineLabel(line)
