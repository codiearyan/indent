import { isBookingRecord, readBookings, type BookingRecord } from '../src/import.ts'

const raw: unknown = JSON.parse('{}')
if (isBookingRecord(raw)) {
  const id: string = raw.id
  const customer: string = raw.customer
  const price: number = raw.priceCents
}
const rows: BookingRecord[] = readBookings('[]')
const record: BookingRecord = { id: 'SW-0981', customer: 'Petra', priceCents: 6500 }
const valid: boolean = isBookingRecord(record)
