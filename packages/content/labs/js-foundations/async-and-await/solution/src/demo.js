// Run with: node src/demo.js
// Every line it prints starts with the time since the demo began. For each task it prints what
// your function gave back right away, and what await got from it after the wait. The tasks run
// one after another.
import { paidLine, stockFor, reorder, closeSale } from './checkout.js'

const start = Date.now()
const print = console.log
console.log = (...parts) => print(`${String(Date.now() - start).padStart(4)} ms `, ...parts)

async function attempt(task, run) {
  try {
    const given = run()
    console.log(`${task}, right away:`, given)
    console.log(`${task}, after await:`, await given)
  } catch (error) {
    console.log(`${task}: ${error.message}`)
  }
}

const noted = { Fig: 0, Sage: 9 }

await attempt('Task 1', () => paidLine({ id: 'WC-3001', candle: 'Cedar', qty: 1, totalCents: 1800 }))
await attempt('Task 2, Fig', () => stockFor('Fig', noted))
await attempt('Task 2, Amber', () => stockFor('Amber', noted))
await attempt('Task 3', () => reorder('Cedar', 10))
await attempt('Task 4', () => closeSale({ id: 'WC-3002', candle: 'Sage', qty: 2, totalCents: 4400 }))
