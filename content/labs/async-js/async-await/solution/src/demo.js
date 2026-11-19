// Run with: node src/demo.js
import { sailingReport } from './sailingReport.js'
import { loadDashboard } from './dashboard.js'
import { saveBooking } from './booking.js'

async function show(label, run) {
  const started = Date.now()
  try {
    const value = await run()
    console.log(label, JSON.stringify(value), `(${Date.now() - started} ms)`)
  } catch (err) {
    console.log(label, `Error: ${err.message}`, `(${Date.now() - started} ms)`)
  }
}

await show('report for quay-gull:', () => sailingReport('quay-gull'))
await show('report for quay-heron:', () => sailingReport('quay-heron'))
await show('dashboard for quay-gull:', () => loadDashboard('quay-gull'))
await show('booking with a good email:', () =>
  saveBooking({ id: 'B7', name: 'Mira', email: 'mira@example.com', seat: '4A' })
)
await show('booking with a broken email:', () =>
  saveBooking({ id: 'B8', name: 'Tomas', email: 'tomas-at-home', seat: '4B' })
)
await show('booking without a name:', () => saveBooking({ id: 'B9', name: '', email: 'x@y.z', seat: '4C' }))
