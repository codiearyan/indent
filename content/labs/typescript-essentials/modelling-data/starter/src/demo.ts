// Run with: node src/demo.ts
// Type-check with: npm run types
import { levelPrice, parseLevel } from './levels.ts'
import { createBooking } from './booking.ts'
import { statusMessage } from './status.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (error) {
    console.log(label, `Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

show('parseLevel of " Full " and "quick":', () => [parseLevel(' Full '), parseLevel('quick')])
show('price of an overhaul in cents:', () => levelPrice('overhaul'))
show('a booking without notes:', () =>
  createBooking('SW-1042', { serial: 'NB-77310', make: 'Norrby' }, 'full')
)
show('status messages:', () => [
  statusMessage({ kind: 'in-repair', mechanic: 'Yusuf' }),
  statusMessage({ kind: 'waiting-for-parts', part: 'a rear derailleur', days: 3 }),
  statusMessage({ kind: 'ready', totalCents: 6500 })
])
