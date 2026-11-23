// Task 2: add up the litres in the log named after the script's name, as the lines go by.
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const file = process.argv[2]

if (file === undefined) {
  console.error('Name the log to add up, like: node water-year.js water/june.txt')
  process.exitCode = 1
} else {
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  let total = 0
  for await (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue
    total += Number(line.split(',')[2])
  }
  console.log(`Total: ${total} litres`)
}
