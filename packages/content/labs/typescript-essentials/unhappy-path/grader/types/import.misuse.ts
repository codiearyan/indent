import { isBookingRecord, readBookings, type BookingRecord } from '../src/import.ts'

// @ts-expect-error: a record's price is a number, not text
const priceText: string = readBookings('[]')[0].priceCents
// @ts-expect-error: readBookings takes the JSON text
readBookings([{ id: 'SW-0981' }])
// @ts-expect-error: isBookingRecord answers true or false
const label: string = isBookingRecord({})
// @ts-expect-error: a record needs a customer
const noCustomer: BookingRecord = { id: 'SW-0981', priceCents: 6500 }
const raw: unknown = JSON.parse('{}')
if (!isBookingRecord(raw)) {
  // @ts-expect-error: outside the guard, the value is still unknown
  raw.id
}
