// Task 4: list the months that have a report, oldest first.
import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

let names = []
try {
  names = await readdir(join(import.meta.dirname, 'reports'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const months = names
  .filter((name) => extname(name) === '.txt')
  .map((name) => basename(name, '.txt'))
  .sort()

console.log(months.length > 0 ? months.join('\n') : 'No reports yet.')
