// Fake Tidewell mail service. It allows at most 3 connections at once and refuses the rest.
let open = 0

export const bookings = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12']

export function sendReminder(bookingId, index) {
  open += 1
  const tooMany = open > 3
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      open -= 1
      if (tooMany) reject(new Error(`Too many connections for ${bookingId}`))
      else if (bookingId === 'B9') reject(new Error('Mailbox full for B9'))
      else resolve(`sent ${bookingId}`)
    }, 80 + ((index * 53) % 120))
  })
}
