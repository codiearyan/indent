import { block, judge } from '../../grading.mjs'

const test = 'src/van.test.js'
const target = 'src/van.js'

// Added to the end of van.js for the log task. It notes which test wrote each line of the day's
// log, and a test that reads the log while it holds lines another test wrote fails with a
// message naming that test. Nothing else about the code changes.
const PROBE = `
import { expect as __indentExpect } from 'vitest'
const __indentOwners = []
function __indentSync() {
  const name = __indentExpect.getState().currentTestName
  if (deliveries.length < __indentOwners.length) __indentOwners.length = deliveries.length
  while (__indentOwners.length < deliveries.length) __indentOwners.push(name)
  return name
}
const __indentDeliver = deliver
deliver = function (...args) {
  __indentSync()
  try {
    return __indentDeliver(...args)
  } finally {
    __indentSync()
  }
}
const __indentClear = clearLog
clearLog = function (...args) {
  try {
    return __indentClear(...args)
  } finally {
    __indentSync()
  }
}
const __indentRead = deliveryLog
deliveryLog = function (...args) {
  const name = __indentSync()
  const other = __indentOwners.find((owner) => owner !== name)
  if (other !== undefined) throw new Error(\`This test reads lines of the log that "\${other}" wrote\`)
  return __indentRead(...args)
}
`
const LEFT = /^Error: This test reads lines of the log that "(.*)" wrote/

const leftBy = (test) => (test.failure ?? '').match(LEFT)?.[1]?.split(' > ').at(-1)

function explain(test) {
  const owner = leftBy(test)
  if (owner) {
    return `"${test.name}" reads the day's log while it still holds what "${owner}" delivered. The log lives in van.js, not in any van, so a fresh van does not empty it. Clear it in afterEach, or in beforeEach, so every test starts with an empty log.`
  }
  if (/No box for .* in the van/.test(test.failure ?? '')) {
    return `"${test.name}" delivers a box that is not in its van. Load every box a test delivers into that test's own van first.`
  }
  return undefined
}

function spoiled(test, label) {
  const owner = leftBy(test)
  if (!owner) return undefined
  return `On a version that ${label}, "${owner}" fails before it clears the log, so "${test.name}" reads what it left there. A test stops at the expect that fails, and the lines after it never run. Clear the log in afterEach, or in beforeEach, which run whether a test passes or fails.`
}

const leftover = (test) =>
  explain(test) ??
  `"${test.name}" passes when it runs alone, but fails after the tests before it. Something an earlier test changed is still there when it starts, like a van it loaded or lines it wrote in the log. Give every test its own fresh start in beforeEach.`

const task = (title, wrong, more = {}) => (t) =>
  judge(t, {
    test,
    target,
    ...block(title),
    wrong,
    limit: 2000,
    alone: true,
    reverse: true,
    explain,
    leftover,
    ...more
  })

const CHECK = '  if (vanWeight(van) + box.kg > VAN_LIMIT_KG) return false\n'
const PUSH = '  van.boxes.push(box)\n'

export const checks = {
  lean: task('loading', [
    {
      label: 'answers true but leaves the box out of the van',
      change: [PUSH, ''],
      hint: 'In the weighing test, load the box into that test\'s own van, then weigh it.'
    },
    {
      label: 'counts the boxes instead of adding up their weight',
      change: ['total + box.kg', 'total + 1'],
      hint: 'Weigh a van that holds a box heavier than 1 kg, and compare with its weight.'
    },
    {
      label: 'turns every box away',
      change: [CHECK, '  return false\n'],
      hint: 'Keep the test that checks a box goes in, and give it a van of its own.'
    }
  ]),

  full: task('full van', [
    {
      label: 'turns away a box that fills the van exactly to its limit',
      change: [CHECK, CHECK.replace('>', '>=')],
      hint: 'Test a box that brings the van exactly to its limit, and expect it to go in.'
    },
    {
      label: 'looks only at what is in the van, so one box can take it over the limit',
      change: [CHECK, '  if (vanWeight(van) > VAN_LIMIT_KG) return false\n'],
      hint: 'Test a box that would take the nearly full van over its limit, and expect it to be turned away.'
    },
    {
      label: 'puts a box it turns away in the van anyway',
      change: [CHECK + PUSH, PUSH + CHECK.replace('+ box.kg ', '')],
      hint: 'After a box is turned away, check the van weighs what it did before.'
    }
  ]),

  log: task(
    'delivery log',
    [
      {
        label: 'writes only the village in the log',
        change: ['`${box.customer}, ${box.village}`', 'box.village'],
        hint: 'Compare the whole log with the lines you expect, name and village.'
      },
      {
        label: 'puts the newest delivery first in the log',
        change: ['deliveries.push(', 'deliveries.unshift('],
        hint: 'Deliver two boxes in one test and compare the log with both lines, in the order they were delivered.'
      },
      {
        label: 'writes the box in the log but leaves it in the van',
        change: ['van.boxes.splice(index, 1)', 'van.boxes.slice(index, index + 1)'],
        hint: 'After a delivery, check the van no longer holds that box: its weight tells you.'
      }
    ],
    { instrument: (code) => code + PROBE, spoiled, fewest: 2 }
  )
}
