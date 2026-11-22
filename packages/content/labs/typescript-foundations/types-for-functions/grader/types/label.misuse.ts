import { tinLabel } from '../src/pricing.ts'

// @ts-expect-error: a label needs a blend
tinLabel()
// @ts-expect-error: a blend is text, not a number
tinLabel(250)
// @ts-expect-error: grams written as text are refused
tinLabel('Smoky Lapsang', '50')
// @ts-expect-error: a label is text, so it is not a number
const asNumber: number = tinLabel('Morning Keemun')
