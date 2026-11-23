// Reads the orders, a line at a time, from the files named or from standard input.
//
// Task 1: Read the files named, a line at a time
// Task 2: Standard input, when no file is named or the name is -
// Task 3: Stop quietly when the reader goes away (in orders.js)
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

export async function* readOrders(names, stdin = process.stdin) {
  for (const name of names.length === 0 ? ['-'] : names) {
    const input = name === '-' ? stdin : createReadStream(name)
    const file = name === '-' ? 'stdin' : name
    let line = 0
    try {
      for await (const text of createInterface({ input, crlfDelay: Infinity })) {
        yield { file, line: ++line, text }
      }
    } finally {
      input.destroy()
    }
  }
}
