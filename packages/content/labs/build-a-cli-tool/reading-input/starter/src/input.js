// Reads the orders from the files named on the command line.
//
// Task 1: Read the files named, a line at a time
// Task 2: Standard input, when no file is named or the name is -
// Task 3: Stop quietly when the reader goes away (in orders.js)
import { readFile } from 'node:fs/promises'

// readOrders(names) gives each line of the files named, in the order they were named, as
// { file, line, text }:
//   file  the name as it was typed, or 'stdin' for a line of standard input
//   line  the number of the line in its file, counting from 1
//   text  the line, without its line break
// Today it reads each file whole, and reads nothing when no file is named.
export async function* readOrders(names) {
  for (const name of names) {
    const lines = (await readFile(name, 'utf8')).split('\n')
    if (lines.at(-1) === '') lines.pop()
    for (const [i, text] of lines.entries()) yield { file: name, line: i + 1, text: text.replace(/\r$/, '') }
  }
}
