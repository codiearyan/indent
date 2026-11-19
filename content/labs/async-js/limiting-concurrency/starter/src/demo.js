// Run with: node src/demo.js
import { bookings, sendReminder } from './services.js'
import { runInBatches } from './batches.js'
import { mapLimit } from './mapLimit.js'
import { mapLimitSettled } from './mapLimitSettled.js'

async function show(label, run) {
  const started = Date.now()
  try {
    const value = await run()
    console.log(label, `(${Date.now() - started} ms)`)
    console.log(' ', JSON.stringify(value, (key, v) => (v instanceof Error ? v.message : v)))
  } catch (err) {
    console.log(label, `Error: ${err.message}`, `(${Date.now() - started} ms)`)
  }
  // Let any job still running finish, so the next line starts with no open connections.
  await new Promise((resolve) => setTimeout(resolve, 300))
}

const allButB9 = bookings.filter((id) => id !== 'B9')

await show('all at once, no limit:', async () => {
  const results = await Promise.allSettled(allButB9.map(sendReminder))
  return `${results.filter((r) => r.status === 'rejected').length} of ${results.length} refused`
})
await show('in batches of 3:', () => runInBatches(allButB9, 3, sendReminder))
await show('at most 3 at a time:', () => mapLimit(allButB9, 3, sendReminder))
await show('at most 3 at a time, B9 included:', () => mapLimit(bookings, 3, sendReminder))
await show('settled, B9 included:', () => mapLimitSettled(bookings, 3, sendReminder))
