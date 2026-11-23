// The table of commands, and the help written from it.
//
// Task 1: Commands from a table (COMMANDS, and main() in orders.js)
// Task 2: Help and the version, from that table (toolHelp, commandHelp)
// Task 3: The nearest command (nearest)
import { checkOrders, countOrders, listOrders } from './shop.js'

// One entry for each command: { summary, flags, run }
//   summary  one line that says what the command does
//   flags    the names of the flags it takes, as in src/flags.js
//   run      the shop's function that does it, from src/shop.js
export const COMMANDS = {}

// The help of the whole tool, as text: how to run it, each command with its summary, and the
// flags help and version.
export function toolHelp(commands, flags) {
  throw new Error('Not implemented')
}

// The help of one command, as text: how to run it, its summary, and each flag it takes.
export function commandHelp(name, commands, flags) {
  throw new Error('Not implemented')
}

// The name in names that is nearest to word, or undefined when none is near enough.
export function nearest(word, names) {
  throw new Error('Not implemented')
}
