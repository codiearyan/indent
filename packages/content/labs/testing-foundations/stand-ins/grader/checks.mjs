import { block, explainWaiting, judge } from '../../grading.mjs'

const test = 'src/checkout.test.js'
const target = 'src/checkout.js'

function explain(test) {
  const { name, failure = '' } = test
  const waiting = explainWaiting(test)
  if (waiting) return waiting
  if (/is not a spy or a call to a spy/.test(failure)) {
    return `"${name}" asks about the calls of a function that does not record them. Only a stand-in made with vi.fn or vi.spyOn keeps its calls, as the lesson shows.`
  }
  if (/charge is not a function|reading 'charge'/.test(failure)) {
    return `"${name}" gives checkout a card company with no charge function on it. Give it an object whose charge is a stand-in made with vi.fn.`
  }
  if (/reading 'push'/.test(failure)) {
    return `"${name}" calls checkout without a packing list. Give it an empty list as its third argument.`
  }
  return undefined
}

// Check runs every test with Math.random giving one number, and the working code once more with
// another: a test that leaves the pick to chance gives a different result on one of them.
const steady = [{ random: 0.3 }, { random: 0.8 }]
const unsteady = {
  where: 'with another random number too',
  message: (name) =>
    `"${name}" gives a different result when the random number changes, so it leaves the pick to chance and only passes some of the time. Set the random number in the test with a stand-in, as the lesson shows.`
}

const task = (title, wrong) => (t) =>
  judge(t, {
    test,
    target,
    ...block(title),
    wrong,
    limit: 2000,
    steady,
    unsteady,
    alone: true,
    explain
  })

const PICK = 'EXTRAS[Math.floor(Math.random() * EXTRAS.length)]'
const CHARGE = '    receipt = await cards.charge(order.customer, pence)\n'
const UNPAID = "    return { status: 'unpaid', reason: error.message }\n"
const CATCH = `  try {\n${CHARGE}  } catch (error) {\n${UNPAID}  }\n`

export const checks = {
  surprise: task('surprise extra', [
    {
      label: 'always picks the first extra',
      change: [PICK, 'EXTRAS[0]'],
      hint: 'Set the random number with a stand-in, to one that should not pick the first extra, and check which one comes out.'
    },
    {
      label: 'never picks the last extra',
      change: [PICK, 'EXTRAS[Math.floor(Math.random() * (EXTRAS.length - 1))]'],
      hint: 'Set the random number close to 1, and check that the last extra comes out.'
    },
    {
      label: 'has lost the bag of apples from its list of extras',
      change: [", 'bag of apples']", ']'],
      hint: 'Work out by hand which extra a random number should pick, and write that extra in your test, not a pick from the list.'
    }
  ]),

  charge: task('charge', [
    {
      label: 'charges in pounds instead of pence',
      change: [CHARGE, CHARGE.replace('pence)', 'order.total)')],
      hint: 'Check what the stand-in for the card company was called with, not only what checkout gives back.'
    },
    {
      label: 'drops the pennies from the total',
      change: ['Math.round(order.total * 100)', 'Math.floor(order.total) * 100'],
      hint: 'Use an order whose total has pennies in it.'
    },
    {
      label: 'charges the card twice',
      change: [CHARGE, `    await cards.charge(order.customer, pence)\n${CHARGE}`],
      hint: 'Check how many times the card company was asked, not only what it was asked for.'
    }
  ]),

  declined: task('declined card', [
    {
      label: "lets the card company's error escape",
      change: [CATCH, CHARGE.replace('    ', '  ')],
      hint: 'Make the stand-in for the card company reject, and check what checkout gives back.'
    },
    {
      label: 'puts an unpaid order on the packing list',
      change: [UNPAID, `    packingList.push(order.customer)\n${UNPAID}`],
      hint: 'Check the packing list after a declined card, not only the answer.'
    },
    {
      label: 'gives the same reason whatever the card company said',
      change: ['reason: error.message', "reason: 'Payment failed'"],
      hint: 'Check that the answer carries the reason the card company gave.'
    }
  ])
}
