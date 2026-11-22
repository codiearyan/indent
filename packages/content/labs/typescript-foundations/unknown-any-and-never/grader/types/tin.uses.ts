import { tinLine } from '../src/cafe.ts'

// A tin with a blend and grams gives a line of text
const line: string = tinLine({ blend: 'Morning Keemun', grams: 250 })
