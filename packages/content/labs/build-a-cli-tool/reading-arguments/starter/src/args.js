// Reads the words typed after `node orders.js` into a command, its values and its flags.
//
// Task 1: Plain words and switches
// Task 2: Flags that take a value
// Task 3: Say plainly what is wrong

// readArgs(args, table) takes the words (process.argv without its first two) and the table of
// the flags the tool knows (see src/flags.js), and returns { command, values, flags }:
//   command  the first plain word, or undefined when there is none
//   values   the plain words after it, in order
//   flags    one entry for each flag given, under its long name: true for a switch, and the
//            text typed for a flag that takes a value
export function readArgs(args, table) {
  throw new Error('Not implemented')
}
