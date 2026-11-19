// Task: Save a booking and always unlock the seat
//
// saveBooking(booking, services) saves a booking { id, name, email, seat } and resolves with
// { saved: true, emailed }.
// - await services.storeBooking(booking). If it rejects, reject with that same error and
//   do not send the ticket
// - then await services.emailTicket(booking). If it rejects, the booking still counts:
//   resolve with emailed: false. Otherwise emailed: true
// - call services.unlockSeat(booking.seat) exactly once in every case, after the other
//   calls have finished
// services defaults to the fake services. The check passes its own.
import * as tidewell from './services.js'

export async function saveBooking(booking, services = tidewell) {
  throw new Error('Not implemented')
}
