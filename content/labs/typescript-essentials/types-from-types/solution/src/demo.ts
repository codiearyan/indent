// Run with: node src/demo.ts
// Type-check with: npm run types
import { sampleBookings } from './booking.ts'
import { pluck } from './fields.ts'
import { applyChange, countLevels } from './changes.ts'
import { brokenRules } from './rules.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (error) {
    console.log(label, `Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const [first] = sampleBookings

show('prices of all bookings:', () => pluck(sampleBookings, 'priceCents'))
show('customer emails:', () => pluck(pluck(sampleBookings, 'customer'), 'email'))
show('first booking moved to the 22nd:', () => applyChange(first, { dropOff: '2026-11-22' }).dropOff)
show('bookings per level:', () => countLevels(sampleBookings))
show('rules broken by the first booking:', () =>
  brokenRules(first, {
    priceCents: (price) => price <= 5000,
    notes: (notes) => notes.length < 200,
    dropOff: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date)
  })
)
