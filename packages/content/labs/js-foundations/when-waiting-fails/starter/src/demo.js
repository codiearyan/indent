// Run with: node src/demo.js
// Every line it prints starts with the time since the demo began. The tasks run one after another,
// and a failure that reaches this file is printed as one, instead of stopping the demo.
import { tryPayment, parcelOrUnknown, chargeWithRetries, payWithScreen } from './payments.js'

const start = Date.now()
const print = console.log
console.log = (...parts) => print(`${String(Date.now() - start).padStart(4)} ms `, ...parts)

async function attempt(task, run) {
  try {
    console.log(`${task}:`, await run())
  } catch (error) {
    console.log(`${task} failed: ${error.message}`)
  }
}

await attempt('Task 1, WC-4001', () => tryPayment({ id: 'WC-4001', totalCents: 1800 }))
await attempt('Task 1, WC-4002', () => tryPayment({ id: 'WC-4002', totalCents: 9000 }))
await attempt('Task 2, P-77', () => parcelOrUnknown('P-77'))
await attempt('Task 2, P-99', () => parcelOrUnknown('P-99'))
await attempt('Task 3, 2600 with 3 tries', () => chargeWithRetries(2600, 3))
await attempt('Task 3, 9000 with 2 tries', () => chargeWithRetries(9000, 2))
await attempt('Task 4, WC-4003', () => payWithScreen({ id: 'WC-4003', totalCents: 1200 }))
await attempt('Task 4, WC-4004', () => payWithScreen({ id: 'WC-4004', totalCents: 7000 }))
