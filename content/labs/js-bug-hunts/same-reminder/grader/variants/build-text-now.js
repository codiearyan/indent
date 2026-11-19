export function scheduleReminders(bookings, send, setTimer = setTimeout) {
  for (const booking of bookings) {
    const text = `Hi ${booking.name}, your ${booking.boat} is ready at ${booking.time}.`
    setTimer(send(booking.phone, text), booking.remindInMs)
  }
  return bookings.length
}
