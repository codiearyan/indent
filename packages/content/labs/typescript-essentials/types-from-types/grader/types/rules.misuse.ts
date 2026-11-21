import type { Booking } from '../src/booking.ts'
import { brokenRules, type Rules } from '../src/rules.ts'

declare const booking: Booking
// @ts-expect-error: a price rule receives a number
const wrongParam: Rules<Booking> = { priceCents: (price: string) => price.length > 0 }
// @ts-expect-error: rules exist only for real keys
const unknownKey: Rules<Booking> = { colour: () => true }
// @ts-expect-error: a rule answers true or false
const wrongReturn: Rules<Booking> = { notes: (notes) => notes }
// @ts-expect-error: brokenRules returns keys of the value, not other strings
const notKeys: 'nope'[] = brokenRules(booking, {})
// @ts-expect-error: rules for a booking must match the booking's members
brokenRules(booking, { notes: (notes: number) => notes > 0 })
