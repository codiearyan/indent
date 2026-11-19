import type { Booking, ServiceLevel } from '../src/booking.ts'
import { pluck, type BookingKey, type CustomerInfo } from '../src/fields.ts'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

declare const bookings: Booking[]
const keys: Equal<BookingKey, 'id' | 'customer' | 'bike' | 'level' | 'dropOff' | 'priceCents' | 'notes'> = true
const customer: Equal<CustomerInfo, { name: string; email: string }> = true
const prices: number[] = pluck(bookings, 'priceCents')
const levels: ServiceLevel[] = pluck(bookings, 'level')
const emails: string[] = pluck(pluck(bookings, 'customer'), 'email')
const photos: readonly { url: string; width: number }[] = []
const widths: number[] = pluck(photos, 'width')
