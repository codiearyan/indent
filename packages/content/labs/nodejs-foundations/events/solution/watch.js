// Task 4: feed the log named after the script's name to a Meter, ring the alarm at the first leak only,
// and say how many readings and leaks there were.
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Meter } from './meter.js'

const file = process.argv[2]

if (file === undefined) {
  console.error('Name the log to watch, like: node watch.js water/june.txt')
  process.exitCode = 1
} else {
  const meter = new Meter(20)
  let readings = 0
  let leaks = 0

  meter.on('reading', () => readings++)
  meter.on('leak', () => leaks++)
  meter.on('error', (error) => {
    console.error(`Skipped: ${error.message}`)
    process.exitCode = 1
  })

  function alarm(reading) {
    console.log(`ALARM: leak on ${reading.tap} at ${reading.time}`)
    meter.off('leak', alarm)
  }
  meter.on('leak', alarm)

  for await (const line of createInterface({ input: createReadStream(file), crlfDelay: Infinity })) {
    meter.feed(line)
  }
  console.log(`Readings: ${readings}. Leaks: ${leaks}.`)
}
