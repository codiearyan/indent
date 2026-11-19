export async function syncBookings(bookings, store) {
  await bookings.forEach(async (booking) => {
    await store.save(booking)
  })
  return bookings.length
}
