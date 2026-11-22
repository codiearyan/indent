// Task 1: print the text of the file named after the script's name.
// Task 2: when there is no such file, print one plain line to standard error and end with exit code 1.
import { readFile } from 'node:fs/promises'

const file = process.argv[2]

try {
  const text = await readFile(file, 'utf8')
  process.stdout.write(text)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  console.error(`There is no file called ${file}.`)
  process.exitCode = 1
}
