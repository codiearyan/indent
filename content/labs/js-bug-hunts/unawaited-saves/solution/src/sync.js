// Task 2: make the evening sync wait for every save (ticket CPC-31).
//
// syncBookings(bookings, store) saves every booking with store.save(booking) and resolves with
// the number of bookings saved, only after every save has finished. If any save fails,
// syncBookings rejects with that error, so the caller's try...catch sees it.

export async function syncBookings(bookings, store) {
  await Promise.all(bookings.map((booking) => store.save(booking)))
  return bookings.length
}
