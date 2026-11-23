// Task 1: count the readings in the log named after the script's name, a line at a time.
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const file = process.argv[2]

if (file === undefined) {
  console.error('Name the log to count, like: node count-readings.js water/june.txt')
  process.exitCode = 1
} else {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  let count = 0
  for await (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue
    count++
  }
  console.log(`${count} readings`)
}
