// Reads the words typed after `node orders.js` into a command, its values and its flags.
// Written in issue 1.

export function readArgs(args, table) {
  const shorts = {}
  for (const [name, flag] of Object.entries(table)) if (flag.short) shorts[flag.short] = name
  const plain = []
  const flags = {}
  let i = 0
  while (i < args.length) {
    const word = args[i++]
    if (word === '--') {
      plain.push(...args.slice(i))
      break
    }
    if (word === '-' || !word.startsWith('-')) {
      plain.push(word)
      continue
    }
    const equals = word.startsWith('--') ? word.indexOf('=') : -1
    const typed = equals === -1 ? word : word.slice(0, equals)
    let name
    if (typed.startsWith('--')) name = typed.slice(2)
    else if (typed.length === 2) name = shorts[typed[1]]
    if (name === undefined || !Object.hasOwn(table, name)) throw new Error(`unknown flag ${typed}`)
    if (!table[name].value) {
      if (equals !== -1) throw new Error(`${typed} takes no value`)
      flags[name] = true
    } else if (equals !== -1) {
      flags[name] = word.slice(equals + 1)
    } else if (i < args.length) {
      flags[name] = args[i++]
    } else {
      throw new Error(`${typed} needs a value`)
    }
  }
  return { command: plain[0], values: plain.slice(1), flags }
}
