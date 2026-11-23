import { percentOff } from '../src/offers.ts'

// @ts-expect-error: a percent written as text is refused
percentOff('10')
// @ts-expect-error: the rule it gives back takes pence as a number, not text
percentOff(10)('1250')
// @ts-expect-error: the price a rule gives back is a number, so it is not text
const asText: string = percentOff(10)(1250)
// @ts-expect-error: percentOff takes the percent alone; the price goes to the rule it gives back
percentOff(10, 1250)
