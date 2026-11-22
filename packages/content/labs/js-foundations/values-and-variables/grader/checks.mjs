import { cases, code, fileProblem, run, show, source } from '../../grading.mjs'

const FILE = 'src/variables.js'

const textHint = (hint) => (v) =>
  v?.type === 'string'
    ? 'cedarOnShelf holds text, not a number. A name inside quotes is just text; a variable is used by writing its name without quotes.'
    : hint

// Task 2 is judged with the lines that change cedarOnShelf later taken out, so Task 3 cannot
// change what Task 2 made.
function shelfCases(t) {
  return cases(t, {
    file: FILE,
    name: 'cedarOnShelf',
    task: 'Task 2',
    drop: /^\s*cedarOnShelf\s*[-+*/]?=(?!=).*$/,
    typed: 'Check changed the delivery and cedarOnShelf stayed the same. Build it on the name cedarDelivered, not on a number you typed.',
    list: [
      {
        name: 'Starts with the candles delivered',
        given: { cedarDelivered: 31, cedarSold: 0 },
        expected: 31,
        hint: textHint('cedarOnShelf should start at the number delivered this morning.')
      },
      {
        name: 'Follows a different delivery',
        given: { cedarDelivered: 12, cedarSold: 0 },
        expected: 12,
        hint: textHint('Check changed the delivery and cedarOnShelf did not start at it.')
      }
    ]
  })
}

async function declaredWith(t, keyword, name) {
  return new RegExp(`\\b${keyword}\\s+${name}\\b`).test(code(await source(t, FILE)))
}

export const checks = {
  async shop(t) {
    const details = await cases(t, {
      file: FILE,
      name: 'shopName',
      task: 'Task 1',
      list: [
        {
          name: 'shopName holds the shop name',
          expected: 'Wickhollow Candles',
          hint: 'shopName holds something else. Compare it with the task letter by letter: capitals and spaces count, and text goes in quotes.'
        }
      ]
    })
    if (!details.every((d) => d.passed)) return details
    const isConst = await declaredWith(t, 'const', 'shopName')
    return [
      ...details,
      {
        name: 'shopName is a const',
        passed: isConst,
        message: isConst
          ? undefined
          : 'The shop name never changes, so the task asks for a const. Look at the word you made it with.'
      }
    ]
  },

  async shelf(t) {
    const details = await shelfCases(t)
    if (details.length === 1 && !details[0].passed) return details
    const isLet = await declaredWith(t, 'let', 'cedarOnShelf')
    return [
      ...details,
      {
        name: 'cedarOnShelf is a let',
        passed: isLet,
        message: isLet
          ? undefined
          : 'The count changes during the day, so the task asks for a let. Look at the word you made it with.'
      }
    ]
  },

  async sell(t) {
    const details = await cases(t, {
      file: FILE,
      name: 'cedarOnShelf',
      task: 'Task 2',
      typed: 'Check changed the numbers at the top and cedarOnShelf stayed the same. Build it on the names, not on a number you typed.',
      mistakes: [
        {
          value: (g) => g.cedarDelivered - 5,
          hint: 'cedarOnShelf takes the same number away every morning, whatever was sold. Use cedarSold, not a number you typed.'
        }
      ],
      list: [
        {
          name: 'Takes the sale off the shelf',
          given: { cedarDelivered: 31, cedarSold: 6 },
          expected: 25,
          hint: textHint(
            'After the sale, cedarOnShelf should be what was on the shelf with the sold candles taken away.'
          )
        },
        {
          name: 'Works when everything sold',
          given: { cedarDelivered: 12, cedarSold: 12 },
          expected: 0,
          hint: textHint('When every candle sold, the shelf should be empty. Check the sum you wrote for Task 3.')
        },
        {
          name: 'Works for another morning',
          given: { cedarDelivered: 40, cedarSold: 1 },
          expected: 39,
          hint: textHint(
            'Check changed the numbers and cedarOnShelf did not follow them. Look at each name in your Task 3 line.'
          )
        }
      ]
    })
    if (details.length === 1 && !details[0].passed) return details
    if (!details.every((d) => d.passed) && !(await shelfCases(t)).every((d) => d.passed)) {
      const message =
        'Task 2 is not right yet, and Task 3 changes the count Task 2 starts. Get Task 2 passing first, then check again.'
      return details.map((d) => (d.passed ? d : { ...d, message }))
    }
    const reassigned = /^\s*cedarOnShelf\s*(-?=)(?!=)/m.test(code(await source(t, FILE)))
    return [
      ...details,
      {
        name: 'Gives cedarOnShelf a new value',
        passed: reassigned,
        message: reassigned
          ? undefined
          : 'Task 3 asks you to change the cedarOnShelf you already made, on a new line under // Task 3, without let or const in front.'
      }
    ]
  },

  async names(t) {
    const r = await run(t, FILE, { names: ['packerName', 'emailerName', 'x', 'y'] })
    const problem = fileProblem(FILE, r)
    if (problem) return [problem]
    const v = r.values
    const holds = (name, text) => v[name]?.type === 'string' && v[name].value === text
    const missing = (name) => v[name]?.type === 'missing'
    return [
      {
        name: 'packerName holds who packs today',
        passed: holds('packerName', 'Ines'),
        message: holds('packerName', 'Ines')
          ? undefined
          : missing('packerName')
            ? 'Check cannot find a variable called packerName. Rename x, keeping its value. Capital letters count.'
            : 'packerName should keep the value x had. Rename the variable, not the value.',
        output: `packerName is ${show(v.packerName)}`
      },
      {
        name: 'emailerName holds who answers emails',
        passed: holds('emailerName', 'Theo'),
        message: holds('emailerName', 'Theo')
          ? undefined
          : missing('emailerName')
            ? 'Check cannot find a variable called emailerName. Rename y, keeping its value. Capital letters count.'
            : 'emailerName should keep the value y had. Rename the variable, not the value.',
        output: `emailerName is ${show(v.emailerName)}`
      },
      {
        name: 'x and y are gone',
        passed: missing('x') && missing('y'),
        message:
          missing('x') && missing('y')
            ? undefined
            : 'x or y is still in the file. Rename them rather than making new variables next to them.'
      }
    ]
  }
}
