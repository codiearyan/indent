// Task 2: print the free plots in plots.txt, using readPlots from plots.js.
// Task 4: with --row and a letter, print only the free plots in that row.
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { readPlots } from './plots.js'

let options
try {
  options = parseArgs({ options: { row: { type: 'string' } } }).values
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

if (options) {
  const plots = await readPlots(join(import.meta.dirname, 'plots.txt'))
  const free = plots
    .filter((p) => p.holder === null)
    .filter((p) => options.row === undefined || p.plot.startsWith(options.row))

  console.log(free.length > 0 ? free.map((p) => p.plot).join('\n') : 'No free plots.')
}
