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
export function isBookingRecord(value) {
  throw new Error('Not implemented')
}

export function readBookings(json) {
  throw new Error('Not implemented')
}
