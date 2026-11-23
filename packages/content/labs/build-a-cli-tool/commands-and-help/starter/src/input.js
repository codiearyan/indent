// Reads the orders from the files named on the command line. Given for now: it reads each file
// whole, which issue 4 changes.
import { readFile } from 'node:fs/promises'

export async function* readOrders(names) {
  for (const name of names) {
    const lines = (await readFile(name, 'utf8')).split('\n')
    if (lines.at(-1) === '') lines.pop()
    for (const [i, text] of lines.entries()) yield { file: name, line: i + 1, text: text.replace(/\r$/, '') }
  }
}
