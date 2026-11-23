import { tinLine } from '../src/cafe.ts'

// @ts-expect-error: a tin without its grams is refused
tinLine({ blend: 'Morning Keemun' })
// @ts-expect-error: a blend on its own is not a tin
tinLine('Morning Keemun')
// @ts-expect-error: a tin line is text, so it is not a number
const asNumber: number = tinLine({ blend: 'Morning Keemun', grams: 250 })
