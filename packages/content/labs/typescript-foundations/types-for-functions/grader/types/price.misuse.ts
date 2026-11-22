import { tinPrice } from '../src/pricing.ts'

// @ts-expect-error: grams written as text are refused
tinPrice('250', 640)
// @ts-expect-error: a price per 100 g written as text is refused
tinPrice(250, '640')
// @ts-expect-error: a price is a number, so it is not text
const asText: string = tinPrice(250, 640)
