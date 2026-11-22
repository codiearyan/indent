import { block, explainWaiting, judge } from '../../grading.mjs'

const test = 'src/stock.test.js'
const target = 'src/stock.js'

// The ways a test of code that answers later goes wrong, said before the usual messages.
function explain(test) {
  const { name, failure = '' } = test
  const waiting = explainWaiting(test)
  if (waiting) return waiting
  if (/expected \[Function\] to throw/.test(failure)) {
    return `"${name}" hands expect a function and expects it to throw. An async function never throws straight away: it hands back a promise that rejects. Give expect the promise and use rejects.`
  }
  if (/promise resolved .* instead of rejecting/.test(failure)) {
    return `"${name}" expects a rejection, but the promise brought back an answer. Check that the shed really has no count for the item you used: capital letters and spaces count.`
  }
  if (/promise rejected .* instead of resolving/.test(failure)) {
    return `"${name}" waits for an answer, but the promise rejected. Read the error in the output: the shed may have no count for an item in your test.`
  }
  return undefined
}

const task = (title, wrong) => (t) =>
  judge(t, {
    test,
    target,
    ...block(title),
    wrong,
    limit: 2000,
    alone: true,
    explain,
    thrown: (name) =>
      `"${name}" stops with an error from stock.js. Read it in the output: the shed may have no count for an item you used.`
  })

const ENOUGH = 'for (const item of items) {'

export const checks = {
  count: task('count', [
    {
      label: 'gives the count as text instead of a number',
      change: ['  return shed[item]\n', '  return String(shed[item])\n'],
      hint: 'Compare the answer with a number using toBe, which tells a number from text.'
    },
    {
      label: 'answers 0 for every item',
      change: ['  return shed[item]\n', '  return 0\n'],
      hint: 'Use an item the shed has some of.'
    }
  ]),

  enough: task('enough', [
    {
      label: 'says no to every order',
      change: ['  return true\n', '  return false\n'],
      hint: 'Test a number of boxes the shed has enough for, and expect a yes.'
    },
    {
      label: 'only looks at the first item on the list',
      change: [ENOUGH, 'for (const item of items.slice(0, 1)) {'],
      hint: 'Test a list where the item that runs short is not the first one, and expect a no.'
    }
  ]),

  unknown: task('unknown item', [
    {
      label: 'answers with nothing for an item it has no count for',
      change: ['if (!(item in shed)) {', 'if (false) {'],
      hint: 'Ask for an item that is not in shed.json, and expect the promise to reject.'
    },
    {
      label: 'turns the item away without naming it',
      change: ['`The shed has no count for ${item}`', "'The shed has no count for that'"],
      hint: 'Check that the message of the error names the item you asked for.'
    }
  ])
}
