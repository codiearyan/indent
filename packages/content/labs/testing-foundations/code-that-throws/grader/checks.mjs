import { block, judge } from '../../grading.mjs'

const test = 'src/orders.test.js'
const target = 'src/orders.js'

// The usual way to get this wrong is to call placeOrder outside expect.
const thrown =
  'stops with the error from placeOrder itself, before expect could see it. The lesson shows how to hand the call to expect so it can catch the error.'

const none =
  'None of them fail on any wrong version. If the order in your test breaks another rule too, that rule throws first, whatever this one does: start from a good order and change only what this rule is about.'

const task = (title, wrong, options = {}) => (t) =>
  judge(t, {
    test,
    target,
    ...block(title),
    wrong,
    thrown: (name) => `"${name}" ${thrown}`,
    none,
    ...options
  })

const SIZE = 'if (!SIZES.includes(size)) {'
const EGGS = 'throw new RangeError(`Eggs come in whole dozens, not ${dozens}`)'
const VILLAGE = 'throw new Error(`We do not deliver to ${village}`)'

export const checks = {
  size: task('unknown size', [
    {
      label: 'takes any size without complaint',
      change: [SIZE, 'if (false) {'],
      hint: 'Use a size the farm does not sell, like huge, and expect the call to throw.'
    },
    {
      label: 'only turns away an order with no size at all',
      change: [SIZE, 'if (size === undefined) {'],
      hint: 'Give the order a size, just not one the farm sells.'
    }
  ]),

  eggs: task('bad eggs', [
    {
      label: 'takes a negative number of dozens',
      change: ['|| dozens < 0', ''],
      hint: 'Use a negative number of dozens, like -1.'
    },
    {
      label: 'throws a plain Error instead of a RangeError',
      change: [EGGS, EGGS.replace('RangeError', 'Error')],
      hint: 'Any error is not enough here: the task asks for the kind of error. The lesson shows how to check it.'
    }
  ]),

  village: task('far village', [
    {
      label: 'delivers anywhere',
      change: ['if (!VILLAGES.includes(village)) {', 'if (false) {'],
      hint: 'Use a village the farm does not deliver to.'
    },
    {
      label: 'says it does not deliver, without naming the village',
      change: [VILLAGE, "throw new Error('We do not deliver there')"],
      hint: 'Check the message of the error for the name of the village you used.'
    }
  ]),

  good: task('good order', [
    {
      label: 'turns away every order with eggs',
      change: ['|| dozens < 0', '|| dozens !== 0'],
      hint: 'Use a good order with eggs in it, as the task says.'
    },
    {
      label: 'drops the eggs from the order',
      change: ['return { customer, size, dozens, village }', 'return { customer, size, dozens: 0, village }'],
      hint: 'Compare everything that comes back with the order you sent, not only that nothing was thrown.'
    }
  ], {
    thrown: (name) =>
      `"${name}" stops with an error from placeOrder, so the order in it breaks one of the rules. Read the error in the output, and make an order that keeps every rule.`,
    none: undefined
  })
}
