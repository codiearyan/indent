// Copied into the sandbox as .grader/drive.mjs. Each helper imports only the file it needs.
export const parseLevel = async (input) => (await import('../src/levels.ts')).parseLevel(input)
export const levelPrice = async (level) => (await import('../src/levels.ts')).levelPrice(level)
export const statusMessage = async (s) => (await import('../src/status.ts')).statusMessage(s)

export async function booking(...args) {
  const result = (await import('../src/booking.ts')).createBooking(...args)
  return { keys: Object.keys(result).sort(), value: result }
}
