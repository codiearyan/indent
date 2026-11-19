import type { Booking } from '../src/booking.ts'
import { brokenRules, type Rules } from '../src/rules.ts'

declare const booking: Booking
const bookingRules: Rules<Booking> = {
  priceCents: (price) => price.toFixed(0).length < 6,
  notes: (notes) => notes.trim().length < 500,
  customer: (customer) => customer.email.includes('@')
}
const none: Rules<Booking> = {}
const broken: (keyof Booking)[] = brokenRules(booking, bookingRules)
const shift = { mechanic: 'Yusuf', hours: 6 }
const shiftRules: Rules<typeof shift> = { hours: (hours) => hours <= 8 }
const shiftBroken: ('mechanic' | 'hours')[] = brokenRules(shift, shiftRules)
