import { partProblem, runPart, show } from '../../when-it-breaks.mjs'

const FILE = 'src/till.js'

const givenText = (given) =>
  Object.entries(given)
    .map(([name, value]) => `${name} = ${JSON.stringify(value)}`)
    .join(', ')

/**
 * Runs one task's lines with Check's own values and reads `name` back. It must be the number
 * `expected`; `typedIn` is what the starter's values give, so holding it means the number was typed
 * in. `why(value, whole)` says what to look at when it is not a number.
 */
async function holds(t, { task, given, name, expected, typedIn, why, wrongNumber }) {
  const r = await runPart(t, FILE, task, { given, names: [name] })
  const problem = partProblem(FILE, task, r)
  if (problem) return [problem]
  const v = r.values[name]
  const passed = v?.type === 'number' && v.value === expected
  const message = passed
    ? undefined
    : v?.type === 'missing'
      ? `Check cannot find ${name} under // Task ${task}. Fix the line that makes it rather than removing it, and keep its name.`
      : v?.type === 'number'
        ? (wrongNumber?.(v.value) ??
          (v.value === typedIn
            ? `${name} is a number now, but not the right one: Check gave the values above it others and ${name} did not follow. Build it on the names, not on a number you typed.`
            : `${name} is a number now, but not the right one. Print each value that goes into it and compare with the comment above it.`))
        : why(v, r.whole)
  return [
    {
      name: `${name} is the right number`,
      passed,
      message,
      output: `With ${givenText(given)}\n${name} is ${show(v)}`
    }
  ]
}

export const checks = {
  total(t) {
    const given = { candlesCents: 2600, shippingText: '350' }
    return holds(t, {
      task: 1,
      given,
      name: 'totalCents',
      expected: 2950,
      typedIn: 4245,
      wrongNumber: (n) =>
        n === Number(`${given.candlesCents}${given.shippingText}`)
          ? 'totalCents is a number now, but the two amounts were still joined like words before it became one. Turn the shipping into a number before the sum, not after.'
          : n === given.candlesCents + 495 || n === 3750 + Number(given.shippingText)
            ? 'totalCents is a number now, but not the right one: Check gave candlesCents and shippingText other values and totalCents did not follow. Build it on both names, not on a number you typed.'
            : undefined,
      why: (v, whole) =>
        v.type === 'string' && !/shippingText\s*=\s*['"`]/.test(whole)
          ? 'totalCents is text when shippingText is text, the way the courier sends it, and Check puts text there. Keep the shippingText line as it was, and make the sum work with text in it.'
          : v.type === 'string' && v.value === String(given.candlesCents + Number(given.shippingText))
            ? 'totalCents holds the right digits, but as text, not a number. Print its type, and look for what turns it into text.'
            : v.type === 'string'
              ? 'totalCents is text, not a number: the two amounts were joined like words instead of added. One of them is text. Print typeof each one to see which, and turn it into a number before the sum.'
              : v.type === 'NaN'
                ? 'totalCents is NaN: one of the amounts did not turn into a real number. Print each one and its type.'
                : `totalCents is ${show(v)}, not a number. Print it and its type, and compare with the comment above it.`
    })
  },

  packed(t) {
    const given = { boxesPacked: 5, candlesPerBox: 6 }
    return holds(t, {
      task: 2,
      given,
      name: 'candlesPacked',
      expected: 30,
      wrongNumber: () =>
        'candlesPacked is a number now, but not every candle in every box, counted from zero. Print it next to boxesPacked and candlesPerBox and compare with the comment above it.',
      why: (v) =>
        v.type === 'NaN'
          ? 'candlesPacked is NaN, which a sum gives when one of its parts is undefined. Print candlesPacked on the line before the sum and see what it holds there.'
          : v.type === 'undefined'
            ? 'candlesPacked is undefined: it is made without a value, and nothing gives it one. The count should start at zero and have the boxes added to it.'
            : `candlesPacked is ${show(v)}, not a number. Print it and its type, and compare with the comment above it.`
    })
  },

  label(t) {
    const given = { labelLine: 'Order 77 for Ana Lu, OSL' }
    return holds(t, {
      task: 3,
      given,
      name: 'labelLength',
      expected: given.labelLine.length,
      typedIn: 30,
      why: (v) =>
        v.type === 'undefined'
          ? 'labelLength is undefined. Asking text for something it does not have gives undefined, not an error. Compare the word after the dot, letter by letter, with the one the lesson uses.'
          : v.type === 'function'
            ? 'labelLength is a function, not a number. What comes after the dot here is a method, so the line hands over the method itself rather than a count.'
            : `labelLength is ${show(v)}, not a number. Print it and its type, and compare with the comment above it.`
    })
  }
}
