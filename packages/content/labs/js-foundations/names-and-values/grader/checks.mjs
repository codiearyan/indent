import { after, partProblem, runPart, shown } from '../../when-it-breaks.mjs'

const FILE = 'src/restock.js'

/**
 * Runs one task's lines with Check's own values and compares what the line starting with `label`
 * prints with `expected`. `typedIn` is what the starter's values give, so printing it means the
 * value was typed in; `why(printed)` says what to look at for any other difference.
 */
async function prints(t, { task, given, label, expected, typedIn, what, why }) {
  const r = await runPart(t, FILE, task, { given })
  const problem = partProblem(FILE, task, r)
  if (problem) return [problem]
  const printed = after(r.lines, label)
  const passed = printed === expected
  return [
    {
      name: `Prints ${what}`,
      passed,
      message: passed
        ? undefined
        : printed === undefined
          ? r.lines.some((l) => l !== '')
            ? `The Task ${task} lines run, but none of the lines they print starts with ${label} as the comment above them shows. Compare the text in quotes with the comment, letter by letter.`
            : `The Task ${task} lines run, but none of the lines they print starts with ${label} as the comment above them shows. Keep the line that prints ${what} and fix the line Node stopped at, rather than removing it.`
          : printed.startsWith('[Function')
            ? `The line prints ${printed}, the method itself rather than what it gives back. Compare it with how the lesson runs a method.`
            : printed === typedIn
              ? typed(Object.keys(given)[0])
              : why(printed),
      output: shown(given, r.lines)
    }
  ]
}

const typed = (name) =>
  `Check gave ${name} another value and the line did not follow. Build the value on the name ${name}, not on a value you typed.`

export const checks = {
  jars(t) {
    return prints(t, {
      task: 1,
      given: { waxJars: 9 },
      label: 'Wax jars left:',
      expected: '9',
      typedIn: '14',
      what: 'the wax jars left',
      why: () => 'The line does not print the number in waxJars. Print waxJars on its own line and compare.'
    })
  },

  shelf(t) {
    const given = { cedarDelivered: 25, cedarSold: 7 }
    return prints(t, {
      task: 2,
      given,
      label: 'On the shelf:',
      expected: String(given.cedarDelivered - given.cedarSold),
      typedIn: '26',
      what: 'the cedar candles left',
      why: (printed) =>
        printed === String(given.cedarDelivered)
          ? 'The shelf shows every candle delivered, with none of the sold ones taken off. The line that takes them off is not wrong: keep it, and let the count change.'
          : 'The count on the shelf is not the candles delivered with the sold ones taken off. Print cedarDelivered, cedarSold and the count next to each other and compare.'
    })
  },

  label(t) {
    const given = { customerName: 'Ada Moss' }
    return prints(t, {
      task: 3,
      given,
      label: 'Label:',
      expected: given.customerName.toUpperCase(),
      typedIn: 'ROSA BELL',
      what: 'the label in capitals',
      why: (printed) =>
        printed === given.customerName
          ? 'The label is the name as it was, not in capital letters. The line that changes it is not wrong: keep it, and let it give label a new value.'
          : "The label is not the customer's name in capital letters. Print label after each line that changes it and compare."
    })
  },

  code(t) {
    const given = { city: ' Porto   ' }
    return prints(t, {
      task: 4,
      given,
      label: 'City code:',
      expected: 'POR',
      typedIn: 'LIS',
      what: 'the city code',
      why: (printed) =>
        printed !== printed.toUpperCase()
          ? 'The city code is not in capital letters. Keep the part of the line that makes it capitals.'
          : printed.length < 3
            ? 'The city code has fewer than three letters. The spaces at the start of the city count as characters until they are trimmed off.'
            : 'The city code is not the first three letters of the city once the spaces around it are gone. Print what each part of the line gives, one step at a time, and compare.'
    })
  }
}
