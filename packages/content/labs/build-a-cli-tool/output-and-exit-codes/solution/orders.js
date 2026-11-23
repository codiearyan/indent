// orders: Ashgrove's own tool for its order files. Try: node orders.js count orders/press-1.txt
//
// Task 1: Results on standard output, messages on standard error
// Task 2: An exit code other programs can act on
// Task 3: --json, for a program to read (and src/flags.js, src/commands.js)
import { readFile } from 'node:fs/promises'
import { readArgs } from './src/args.js'
import { COMMANDS, commandHelp, nearest, toolHelp } from './src/commands.js'
import { FLAGS } from './src/flags.js'
import { readOrders } from './src/input.js'

async function version() {
  const pkg = JSON.parse(await readFile(new URL('package.json', import.meta.url), 'utf8'))
  return pkg.version
}

async function main(args) {
  const { command, values, flags } = readArgs(args, FLAGS)
  if (flags.version) {
    console.log(await version())
    return 0
  }
  if (command === undefined) {
    console.log(toolHelp(COMMANDS, FLAGS))
    return 0
  }
  if (!Object.hasOwn(COMMANDS, command)) {
    const near = nearest(command, Object.keys(COMMANDS))
    throw new Error(
      near
        ? `unknown command ${command} (did you mean ${near}?)`
        : `unknown command ${command} (orders --help lists the commands)`
    )
  }
  if (flags.help) {
    console.log(commandHelp(command, COMMANDS, FLAGS))
    return 0
  }
  // How a command speaks: out.result(text, value) for each result, out.note(text) for a message.
  const out = {
    result: (text, value) => console.log(flags.json ? JSON.stringify(value) : text),
    note: (text) => console.error(text)
  }
  const ok = await COMMANDS[command].run(readOrders(values), flags, out)
  return ok ? 0 : 1
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  console.error(`orders: ${error.message}`)
  process.exitCode = 2
}
