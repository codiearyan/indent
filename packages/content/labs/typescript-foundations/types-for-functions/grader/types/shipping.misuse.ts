import { shippingFor } from '../src/pricing.ts'

// @ts-expect-error: a call must say whether the order goes express
shippingFor(1200)
// @ts-expect-error: grams written as text are refused
shippingFor('1200', false)
// @ts-expect-error: express is true or false, not a word
shippingFor(1200, 'yes')
// @ts-expect-error: the shipping is a number, so it is not text
const asText: string = shippingFor(1200, false)
