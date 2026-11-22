// Task 4: read the plot list named first and print who holds the plot named second.
import { readFile } from 'node:fs/promises'

const [file, plot] = process.argv.slice(2)
const text = await readFile(file, 'utf8')
const line = text.split(/\r?\n/).find((l) => l.split(',')[0] === plot)

if (line === undefined) {
  console.error(`There is no plot ${plot} in ${file}.`)
  process.exitCode = 1
} else {
  const holder = line.split(',')[1]
  console.log(`${plot}: ${holder === '' ? 'free' : holder}`)
}
