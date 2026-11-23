// Run with: node src/demo.js
// Prints the reminders as this computer sends them, then as they come out when the computer's
// clock is set to another time zone, the way Kwame's laptop was in Vancouver.
import { reminder } from './reminder.js'
import { invoices, sentOn } from './invoices.js'

function print(where) {
  console.log(`Sent on ${sentOn}, ${where}:`)
  for (const invoice of invoices) {
    const { due, daysLeft } = reminder(invoice, sentOn)
    const when = daysLeft >= 0 ? `in ${daysLeft} days` : `${-daysLeft} days late`
    console.log(`  ${invoice.number}  ${invoice.choir.padEnd(20)} due ${due}, ${when}`)
  }
  console.log()
}

print(`on this computer (${Intl.DateTimeFormat().resolvedOptions().timeZone})`)
for (const zone of ['America/Vancouver', 'Asia/Tokyo']) {
  const before = process.env.TZ
  process.env.TZ = zone
  print(`on a computer set to ${zone}`)
  if (before === undefined) delete process.env.TZ
  else process.env.TZ = before
}
