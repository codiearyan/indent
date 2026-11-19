// Copied into the sandbox as .grader/drive.mjs. Runs syncBookings against fake stores.
import { syncBookings } from '../src/sync.js'
import { createFakeStore } from '../src/store.js'

const escaped = []
process.on('unhandledRejection', (err) => escaped.push(String(err?.message ?? err)))

const bookings = (n) => Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, name: `Guest ${i + 1}` }))

export async function run(n, failOn = []) {
  const store = createFakeStore({ delayMs: 5, failOn })
  let returned
  let error
  try {
    returned = await syncBookings(bookings(n), store)
  } catch (err) {
    error = String(err?.message ?? err)
  }
  const savedWhenDone = store.saved().length
  await new Promise((resolve) => setTimeout(resolve, 60))
  return { returned: returned ?? null, error: error ?? null, savedWhenDone, escaped }
}
