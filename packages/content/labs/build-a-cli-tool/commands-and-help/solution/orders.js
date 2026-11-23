// orders: Ashgrove's own tool for its order files. Try: node orders.js count orders/press-1.txt
//
// Task 1: Commands from a table (COMMANDS in src/commands.js, and main() below)
// Task 2: Help and the version, from that table
// Task 3: An unknown command answered with the nearest one
import { readFile } from 'node:fs/promises'
import { readArgs } from './src/args.js'
import { COMMANDS, commandHelp, nearest, toolHelp } from './src/commands.js'
import { FLAGS } from './src/flags.js'
import { readOrders } from './src/input.js'

// How a command speaks. Given for now: issue 3 looks at where each kind of text should go.
const out = {
  result: (text) => console.log(text),
  note: (text) => console.log(text)
}

async function version() {
  const pkg = JSON.parse(await readFile(new URL('package.json', import.meta.url), 'utf8'))
  return pkg.version
}

async function main(args) {
  const { command, values, flags } = readArgs(args, FLAGS)
  if (flags.version) return console.log(await version())
  if (command === undefined) return console.log(toolHelp(COMMANDS, FLAGS))
  if (!Object.hasOwn(COMMANDS, command)) {
    const near = nearest(command, Object.keys(COMMANDS))
    throw new Error(
      near
        ? `unknown command ${command} (did you mean ${near}?)`
        : `unknown command ${command} (orders --help lists the commands)`
    )
  }
  if (flags.help) return console.log(commandHelp(command, COMMANDS, FLAGS))
  await COMMANDS[command].run(readOrders(values), flags, out)
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  console.log(`orders: ${error.message}`)
}
