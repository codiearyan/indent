import type { Booking } from '../src/booking.ts'
import { pluck, type BookingKey, type CustomerInfo } from '../src/fields.ts'

declare const bookings: Booking[]
// @ts-expect-error: 'colour' is not a key of Booking
pluck(bookings, 'colour')
// @ts-expect-error: prices are numbers, so pluck gives number[]
const wrong: string[] = pluck(bookings, 'priceCents')
// @ts-expect-error: CustomerInfo has no phone
const withPhone: CustomerInfo = { name: 'Petra', email: 'petra@example.com', phone: '0612' }
// @ts-expect-error: 'colour' is not a BookingKey
const colour: BookingKey = 'colour'
