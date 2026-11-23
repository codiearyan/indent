// The table of commands, and the help written from it.
//
// Task 1: Commands from a table (COMMANDS, and main() in orders.js)
// Task 2: Help and the version, from that table (toolHelp, commandHelp)
// Task 3: The nearest command (nearest)
import { checkOrders, countOrders, listOrders } from './shop.js'

export const COMMANDS = {
  count: { summary: 'Count the orders, or count them by a field', flags: ['paper', 'by', 'json', 'help'], run: countOrders },
  list: { summary: 'List the orders, one on each line', flags: ['paper', 'limit', 'json', 'help'], run: listOrders },
  check: { summary: 'Check every order before a print run', flags: ['json', 'help'], run: checkOrders }
}

function flagLine(name, flag) {
  const short = flag.short ? `, -${flag.short}` : ''
  const value = flag.value ? ` <${flag.value}>` : ''
  return [`--${name}${short}${value}`, flag.about]
}

// Two columns, the second lined up.
function rows(pairs) {
  const width = Math.max(0, ...pairs.map(([left]) => left.length))
  return pairs.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`)
}

export function toolHelp(commands, flags) {
  return [
    'Usage: orders <command> [flags] [file ...]',
    '',
    'Commands:',
    ...rows(Object.entries(commands).map(([name, command]) => [name, command.summary])),
    '',
    'Flags:',
    ...rows(['help', 'version'].map((name) => flagLine(name, flags[name]))),
    '',
    'Run orders <command> --help to see the flags of a command.'
  ].join('\n')
}

export function commandHelp(name, commands, flags) {
  const command = commands[name]
  return [
    `Usage: orders ${name} [flags] [file ...]`,
    '',
    command.summary,
    '',
    'Flags:',
    ...rows(command.flags.map((flag) => flagLine(flag, flags[flag])))
  ].join('\n')
}

// How many letters must be added, removed or replaced to turn a into b.
function distance(a, b) {
  let above = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const replace = above[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      row[j] = Math.min(above[j] + 1, row[j - 1] + 1, replace)
    }
    above = row
  }
  return above[b.length]
}

export function nearest(word, names) {
  let best
  let fewest = 3
  for (const name of names) {
    const changes = distance(word, name)
    if (changes < fewest) {
      best = name
      fewest = changes
    }
  }
  return best
}
