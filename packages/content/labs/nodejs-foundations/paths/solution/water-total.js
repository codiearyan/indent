// Task 2: add up the litres in water/readings.txt, the file beside this script, from wherever
// the command is typed.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const readings = join(import.meta.dirname, 'water', 'readings.txt')
const text = await readFile(readings, 'utf8')

let total = 0
for (const line of text.split(/\r?\n/)) {
  if (line.trim() === '') continue
  total += Number(line.split(',')[2])
}

console.log(`Total: ${total} litres`)
