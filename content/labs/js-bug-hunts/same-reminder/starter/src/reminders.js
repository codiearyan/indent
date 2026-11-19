// Task 2: send every reminder to the right customer (ticket CPC-19).
//
// scheduleReminders(bookings, send, setTimer) schedules one reminder per booking with
// setTimer(callback, booking.remindInMs). When a timer fires, it calls
// send(booking.phone, `Hi ${name}, your ${boat} is ready at ${time}.`) for that booking.
// Nothing is sent before its timer fires. The caller may reuse or empty its bookings array
// right after scheduling. Returns how many reminders were scheduled.

export function scheduleReminders(bookings, send, setTimer = setTimeout) {
  for (var i = 0; i < bookings.length; i++) {
    var booking = bookings[i]
    setTimer(() => {
      send(booking.phone, `Hi ${booking.name}, your ${booking.boat} is ready at ${booking.time}.`)
    }, booking.remindInMs)
  }
  return bookings.length
}
