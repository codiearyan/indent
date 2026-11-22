// Task 1: add the name typed after the script's name to the end of waiting-list.txt.
import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'

const name = process.argv.slice(2).join(' ')

if (name === '') {
  console.error('Type the name to add after the script name.')
  process.exitCode = 1
} else {
  await appendFile(join(import.meta.dirname, 'waiting-list.txt'), `${name}\n`)
  console.log(`Added ${name} to the waiting list.`)
}
