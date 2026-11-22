// Task 3: print the full path, the name and the extension of the path typed after the script's name.
import { basename, extname, resolve } from 'node:path'

const typed = process.argv[2]

if (typed === undefined) {
  console.error('Type a path after the script name, the way you would to open the file.')
  process.exitCode = 1
} else {
  console.log(`Full path: ${resolve(typed)}`)
  console.log(`Name: ${basename(typed)}`)
  console.log(`Extension: ${extname(typed) || 'none'}`)
}
