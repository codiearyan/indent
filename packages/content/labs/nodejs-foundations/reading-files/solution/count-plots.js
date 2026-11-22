// Task 3: read the plot list named after the script's name and print how many plots it has and
// how many of them are free.
import { readFile } from 'node:fs/promises'

const text = await readFile(process.argv[2], 'utf8')
const plots = text
  .split(/\r?\n/)
  .filter((line) => line.trim() !== '')
  .map((line) => line.split(','))
const free = plots.filter(([, holder]) => holder.trim() === '')

console.log(`${plots.length} plots, ${free.length} free`)
