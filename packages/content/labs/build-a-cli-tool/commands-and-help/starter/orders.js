// orders: Ashgrove's own tool for its order files. Try: node orders.js count orders/press-1.txt
//
// Task 1: Commands from a table (COMMANDS in src/commands.js, and main() below)
// Task 2: Help and the version, from that table
// Task 3: An unknown command answered with the nearest one
import { readArgs } from './src/args.js'
import { FLAGS } from './src/flags.js'
import { readOrders } from './src/input.js'

// How a command speaks. Given for now: issue 3 looks at where each kind of text should go.
const out = {
  result: (text) => console.log(text),
  note: (text) => console.log(text)
}

// main(args) reads the words, finds the command in COMMANDS and runs it with
// readOrders(values), the flags and out.
async function main(args) {
  const { command, values, flags } = readArgs(args, FLAGS)
  throw new Error('Not implemented')
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  console.log(`orders: ${error.message}`)
}
