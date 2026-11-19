// A fake bookings store for the demo and tests. Each save takes delayMs, like a slow database.
// Saves of ids listed in failOn reject with an error.

export function createFakeStore({ delayMs = 10, failOn = [] } = {}) {
  const saved = []
  return {
    async save(booking) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (failOn.includes(booking.id)) throw new Error(`Could not save ${booking.id}`)
      saved.push(booking.id)
    },
    saved: () => [...saved]
  }
}

export const evening = [
  { id: 'b101', name: 'Amara', boat: 'double kayak' },
  { id: 'b102', name: 'Joon', boat: 'paddleboard' },
  { id: 'b103', name: 'Priya', boat: 'single kayak' }
]
