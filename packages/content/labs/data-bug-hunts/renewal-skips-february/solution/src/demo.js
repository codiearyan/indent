// Run with: node src/demo.js
// Prints the next renewals and follow-ups as this computer works them out, then as they come
// out on a computer in London, where the shop is.
import { remindAt, renewsOn } from './renewals.js'
import { followUps, subscriptions } from './subscriptions.js'

function print(where) {
  console.log(`${where}:`)
  for (const { choir, started } of subscriptions) {
    const next = [1, 2, 3].map((months) => renewsOn(started, months)).join(', ')
    console.log(`  ${choir.padEnd(20)} started ${started}, renews ${next}`)
  }
  for (const { invoice, sendAt, days } of followUps) {
    console.log(`  ${invoice} reminder ${sendAt}, follow-up ${days} days later: ${remindAt(sendAt, days)}`)
  }
  console.log()
}

print(`On this computer (${Intl.DateTimeFormat().resolvedOptions().timeZone})`)
const before = process.env.TZ
process.env.TZ = 'Europe/London'
print('On a computer set to Europe/London')
if (before === undefined) delete process.env.TZ
else process.env.TZ = before
