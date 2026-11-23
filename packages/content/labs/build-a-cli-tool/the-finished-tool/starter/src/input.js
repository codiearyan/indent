// Reads the orders, a line at a time, from the files named or from standard input.
// Written in issue 4.
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
