import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { block, fileProblem, judge, runTests, shortFailure } from '../../grading.mjs'

const test = 'src/loyalty.test.js'
const target = 'src/loyalty.js'

const LARGE = "    if (size === 'large') return BOX_PRICES.large - BOX_PRICES.medium\n"
const FREE = 'boxNumber % 10 === 0'
const PLAIN = '  return BOX_PRICES[size]\n}'

const testTask = (title, options) => (t) =>
  judge(t, { test, target, ...block(title), limit: 2000, ...options })

// A code task passes when boxPrice in the learner's own file gives the right price for Check's
// cases, and the learner's tests for that rule pass on it. The tests come first, so a rule with
// no test for it yet is sent back to the task before.
const codeTask = (title, earlier, cases) => async (t) => {
  const dir = await t.sandbox()
  const own = await readFile(join(t.workspace, target), 'utf8').catch(() => '')
  const [run, ...answers] = await Promise.all([
    runTests(t, { test, target, code: own, args: ['--testTimeout=2000'] }),
    ...cases.map(([size, number]) => t.call(dir, target, 'boxPrice', [size, number]))
  ])
  const broken = answers.find((a) => !a.ok)
  if (broken) {
    return [
      {
        name: 'boxPrice runs',
        passed: false,
        message: 'boxPrice stops with an error. Run your tests in the terminal and read the error and the line it points at.',
        output: broken.error
      }
    ]
  }
  const details = cases.map(([size, number, price, about], i) => {
    const passed = answers[i].value === price
    return {
      name: `Prices ${about}`,
      passed,
      message: passed
        ? undefined
        : `boxPrice does not price ${about} the way Bridget's rule says yet. Read the rule in the task again, and run your tests.`,
      output: `boxPrice('${size}', ${number}) gave ${JSON.stringify(answers[i].value)}`
    }
  })
  const problem = fileProblem(test, run)
  if (problem) return [...details, problem]
  const mine = run.tests.filter((x) => x.group[0] === title && (x.status === 'passed' || x.status === 'failed'))
  const failing = mine.filter((x) => x.status === 'failed')
  details.push({
    name: `Your tests in the ${title} block pass on your code`,
    passed: mine.length > 0 && !failing.length,
    message: !mine.length
      ? `Check finds no test in the ${title} block. In this issue the test comes first: go back to "${earlier}", write it, and watch it fail before you write the code.`
      : failing.length
        ? `"${failing[0].name}" fails on your boxPrice. Run the tests in the terminal: Expected is what your test says the rule wants, Received is what your code gave.`
        : undefined,
    output: failing.length ? `${failing[0].name}\n${shortFailure(failing[0].failure)}` : undefined
  })
  return details
}

export const checks = {
  'free-test': testTask('free box', {
    base: [LARGE, ''],
    wrong: [
      {
        label: 'does not have the free box yet',
        change: [`  if (${FREE}) {\n    return 0\n  }\n`, ''],
        hint: 'Your test must fail on boxPrice as it is in the starter. Check a box that should be free.'
      },
      {
        label: 'makes the box before the tenth free',
        change: [FREE, 'boxNumber % 10 === 9'],
        hint: 'Check that the box just before a free one pays the usual price.'
      },
      {
        label: 'makes every box from the tenth on free',
        change: [FREE, 'boxNumber >= 10'],
        hint: 'Check that the box just after a free one pays the usual price.'
      },
      {
        label: 'makes only the tenth box free, never the twentieth',
        change: [FREE, 'boxNumber === 10'],
        hint: 'Every tenth box is free, not only the first: check the next free box too.'
      }
    ]
  }),

  'free-code': codeTask('free box', 'Write a failing test for the free box', [
    ['medium', 10, 0, 'a tenth medium box'],
    ['small', 30, 0, 'a thirtieth small box'],
    ['medium', 19, 19, 'the box before a free one'],
    ['small', 21, 14, 'the box after a free one'],
    ['small', 1, 14, 'a first box']
  ]),

  'large-test': testTask('large free box', {
    wrong: [
      {
        label: 'does not have the large box rule yet',
        change: [LARGE, ''],
        hint: 'Your test must fail on code that gives every box on a free turn away. Check a large box on a free turn.'
      },
      {
        label: 'charges a large box on a free turn the price of a medium',
        change: [LARGE, LARGE.replace('BOX_PRICES.large - BOX_PRICES.medium', 'BOX_PRICES.medium')],
        hint: 'Work out by hand what a large box costs over a medium, and expect that.'
      },
      {
        label: 'takes the price of a medium off large boxes on every turn',
        change: [PLAIN, `  if (size === 'large') return BOX_PRICES.large - BOX_PRICES.medium\n${PLAIN}`],
        hint: 'Check that a large box on a turn that is not free still pays the usual price.'
      }
    ]
  }),

  'large-code': codeTask('large free box', 'Write a failing test for a large free box', [
    ['large', 10, 5, 'a large box on a free turn'],
    ['large', 40, 5, 'a large box on a later free turn'],
    ['large', 7, 24, 'a large box on another turn'],
    ['medium', 20, 0, 'a medium box on a free turn'],
    ['small', 10, 0, 'a small box on a free turn']
  ])
}
