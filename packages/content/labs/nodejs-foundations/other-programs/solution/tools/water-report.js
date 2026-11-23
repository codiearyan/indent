// Imran's water report for one month. Do not change it: the server runs it as it is.
//   node tools/water-report.js 2026-06
// It reads water/<month>.txt and prints the report on standard output, with exit code 0.
// Exit code 2: the month is not written like 2026-06. The reason is on standard error.
// Exit code 3: there are no readings for that month. The reason is on standard error.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'

const month = process.argv[2] ?? ''

if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
  console.error(`Not a month: "${month}". Write it like 2026-06.`)
  process.exitCode = 2
} else {
  const text = await readFile(join(import.meta.dirname, '..', 'water', `${month}.txt`), 'utf8').catch(() => null)
  if (text === null) {
    console.error(`No readings for ${month}.`)
    process.exitCode = 3
  } else {
    const totals = new Map()
    for (const line of text.split(/\r?\n/)) {
      const [time, tap, litres] = line.split(',')
      if (time === undefined || time.trim() === '' || time.startsWith('#') || tap === undefined) continue
      totals.set(tap, (totals.get(tap) ?? 0) + Number(litres))
    }
    console.log(`Water report for ${month}`)
    // Adding up a whole month takes the old laptop a moment.
    await pause(150)
    let all = 0
    for (const [tap, litres] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`${tap}: ${litres} litres`)
      all += litres
    }
    console.log(`Total: ${all} litres`)
  }
}
