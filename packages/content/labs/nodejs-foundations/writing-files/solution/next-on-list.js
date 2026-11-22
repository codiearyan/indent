// Task 2: take the first name off waiting-list.txt and say who to offer the plot to.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const list = join(import.meta.dirname, 'waiting-list.txt')
const names = (await readFile(list, 'utf8')).split(/\r?\n/).filter((line) => line.trim() !== '')

if (names.length === 0) {
  console.log('Nobody is waiting.')
} else {
  const [first, ...rest] = names
  await writeFile(list, rest.map((name) => `${name}\n`).join(''))
  console.log(`Offer the plot to ${first}.`)
}
