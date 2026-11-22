import { partProblem, runPart, shown } from '../../when-it-breaks.mjs'

const FILE = 'src/morning.js'

const plain = (text) => text.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Runs one task's lines with Check's own value for `name` and looks for the line that starts with
 * `label` followed by that value. `close` is the label as it reads without its apostrophe.
 */
async function prints(t, { task, name, value, label, close, what }) {
  const given = { [name]: value }
  const r = await runPart(t, FILE, task, { given })
  const problem = partProblem(FILE, task, r)
  if (problem) return [problem]
  const output = shown(given, r.lines)
  const line = r.lines.find((l) => plain(l).startsWith(plain(label)))
  const near = !line && close && r.lines.find((l) => plain(l).startsWith(close))
  const ok = line !== undefined && plain(line).slice(plain(label).length).trim() === plain(String(value))
  const message = ok
    ? undefined
    : near
      ? `The line runs now, but the apostrophe in Today's is gone. Theo wants the text exactly as before: keep the apostrophe, and write the text so that it does not end it.`
      : !line && r.lines.some((l) => l !== '')
        ? `The Task ${task} lines run, but none of the lines they print starts with ${label} as the comment above them shows. Compare the text in quotes with the comment, letter by letter.`
        : !line
          ? `The Task ${task} lines run, but none of the lines they print starts with ${label} as the comment above them shows. The broken line is the one that prints ${what}: fix it rather than removing it.`
          : line.includes(name)
            ? `The line prints the word ${name}, not the value it holds. A name inside the quotes is only text: keep the name outside them.`
            : `The line does not print what ${name} holds: Check gave ${name} another value and the line did not follow. Print the name ${name}, not a value you typed.`
  return [
    {
      name: `Prints ${what} from ${name}`,
      passed: ok,
      message,
      output
    }
  ]
}

export const checks = {
  poured(t) {
    return prints(t, {
      task: 1,
      name: 'candlesPoured',
      value: 23,
      label: 'Candles poured:',
      what: 'the candles poured'
    })
  },

  waiting(t) {
    return prints(t, {
      task: 2,
      name: 'ordersWaiting',
      value: 9,
      label: 'Orders waiting:',
      what: 'the orders waiting'
    })
  },

  packed(t) {
    return prints(t, {
      task: 3,
      name: 'parcelsPacked',
      value: 7,
      label: 'Parcels packed:',
      what: 'the parcels packed'
    })
  },

  candle(t) {
    return prints(t, {
      task: 4,
      name: 'candleOfTheDay',
      value: 'Juniper',
      label: "Today's candle is",
      close: 'todays candle is',
      what: "today's candle"
    })
  }
}
