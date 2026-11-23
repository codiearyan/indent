// Task 3: add up the litres of each tap in the log named after the script's name.
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const file = process.argv[2]

if (file === undefined) {
  console.error('Name the log to add up, like: node tap-totals.js water/june.txt')
  process.exitCode = 1
} else {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  const totals = new Map()
  for await (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const [, tap, litres] = line.split(',')
    totals.set(tap, (totals.get(tap) ?? 0) + Number(litres))
  }
  for (const tap of [...totals.keys()].sort()) {
    console.log(`${tap}: ${totals.get(tap)} litres`)
  }
}
