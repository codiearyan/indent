import { toCents } from '../src/price.ts'

const fromNumber: number | null = toCents(12.5)
const fromText: number | null = toCents(' 12.50 ')
const either = (input: number | string): number | null => toCents(input)
