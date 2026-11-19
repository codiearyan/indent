// Task: Importing bookings you cannot trust
//
// The old app exported its bookings as JSON. Some rows are broken.
//
// - Export an interface BookingRecord: id (string), customer (string), priceCents (number).
// - isBookingRecord(value: unknown) is a type guard. It returns true only for a non-null
//   object whose id and customer are strings and whose priceCents is a number.
// - readBookings(json: string): BookingRecord[] parses the JSON. When the result is not an
//   array it throws an Error whose message contains 'array'. Otherwise it returns only the
//   rows that are valid records, in order. Invalid JSON may throw the parser's own error.
// - JSON.parse returns any. Put its result straight into a variable of type unknown.
export interface BookingRecord {
  id: string
  customer: string
  priceCents: number
}

export function isBookingRecord(value: unknown): value is BookingRecord {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'customer' in value &&
    typeof value.customer === 'string' &&
    'priceCents' in value &&
    typeof value.priceCents === 'number'
  )
}

export function readBookings(json: string): BookingRecord[] {
  const data: unknown = JSON.parse(json)
  if (!Array.isArray(data)) throw new Error('Expected an array of bookings')
  return data.filter(isBookingRecord)
}
