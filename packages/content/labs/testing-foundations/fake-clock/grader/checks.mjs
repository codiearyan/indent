import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  block,
  fileProblem,
  judge,
  runTests,
  shortFailure,
  workingCode,
  wrongVersion
} from '../../grading.mjs'

const test = 'src/schedule.test.js'
const target = 'src/schedule.js'
const limit = 2000

// Check runs every test as if today were a Tuesday morning, and the working code once more as if
// it were a Thursday evening: a test that reads the real clock gives a different result on one.
const steady = [
  { clock: new Date(2031, 6, 15, 9, 30).getTime() },
  { clock: new Date(2031, 6, 17, 19, 45).getTime() }
]

function explain({ name, failure = '' }) {
  if (/timers APIs are not mocked/.test(failure)) {
    return `"${name}" moves the clock on, but the fake clock is not on. Turn it on first, as the lesson shows.`
  }
  if (/^AssertionError/.test(failure)) {
    return `"${name}" fails on the farm's working code. Check runs your tests on another day and at another time than today, so a test that does not set the date itself reads the real clock. If it does set the date, work the expected answer out again from the rules, and compare the Expected and Received lines in the terminal.`
  }
  return undefined
}

const task = (title, wrong) => (t) =>
  judge(t, { test, target, ...block(title), wrong, limit, steady, alone: true, explain })

const MONTH = 'date.getMonth() + 1'
const WEDNESDAY = 'if (day === WEDNESDAY) return now.getHours() < CUTOFF_HOUR'
const HOLD = 'HOLD_MINUTES * 60 * 1000'
const RELEASE = "hold.status = 'released'"

const wrong = {
  late: {
    label: 'gives the Friday a week later',
    change: [
      'let days = (FRIDAY - now.getDay() + 7) % 7',
      'let days = ((FRIDAY - now.getDay() + 7) % 7) + 7'
    ],
    hint: 'Set the clock to a Monday and check the exact date of the Friday that order goes out.'
  },
  month: {
    label: 'writes the month one too low',
    change: [MONTH, 'date.getMonth()'],
    hint: 'Compare the whole date the code gives, year, month and day, with the one you worked out.'
  },
  early: {
    label: 'closes at 5 in the evening',
    change: [WEDNESDAY, WEDNESDAY.replace('< CUTOFF_HOUR', '< CUTOFF_HOUR - 1')],
    hint: 'Test a Wednesday as close before the cut-off as you can, and expect orders to be open.'
  },
  hourLate: {
    label: 'closes at 7 in the evening',
    change: [WEDNESDAY, WEDNESDAY.replace('< CUTOFF_HOUR', '< CUTOFF_HOUR + 1')],
    hint: 'Test a Wednesday at the cut-off itself, not later in the evening, and expect orders to be closed.'
  },
  allDay: {
    label: 'takes orders all day on Wednesday',
    change: [WEDNESDAY, 'if (day === WEDNESDAY) return true'],
    hint: 'Test a Wednesday at the cut-off itself, and expect orders to be closed.'
  },
  seconds: {
    label: 'lets go after 15 seconds',
    change: [HOLD, 'HOLD_MINUTES * 1000'],
    hint: 'Check that the basket is still held a while before the 15 minutes are up.'
  },
  never: {
    label: 'never lets go',
    change: [RELEASE, "hold.status = 'held'"],
    hint: 'Move the fake clock on by the whole 15 minutes and check that the hold was let go.'
  },
  minuteLate: {
    label: 'lets go a minute late',
    change: [HOLD, '(HOLD_MINUTES + 1) * 60 * 1000'],
    hint: 'Move the fake clock on by exactly 15 minutes, not more, and check that the hold was let go.'
  },
  minute: {
    label: 'lets go a minute early',
    change: [HOLD, '(HOLD_MINUTES - 1) * 60 * 1000'],
    hint: 'Check the basket just before the 15 minutes are up, as close to the end as you can.'
  }
}

// Put in front of the test file for the clean-up task. After each test, once every afterEach has
// run, it notes whether the clock is still fake, and it counts the times the tests set the clock.
const PROBE = '.indent-clock-probe.json'
const before = [
  "import { afterEach as __indentAfterEach, vi as __indentVi } from 'vitest';",
  "import { writeFileSync as __indentWrite } from 'node:fs';",
  'const __indentDate = Date; const __indentSeen = { set: 0, left: [] };',
  "for (const key of ['useFakeTimers', 'setSystemTime']) { const real = __indentVi[key]; __indentVi[key] = function (...args) { __indentSeen.set++; return real.apply(this, args) } }",
  '__indentAfterEach((context) => {',
  "if (__indentVi.isFakeTimers() || Date !== __indentDate) __indentSeen.left.push(context.task.fullName.split(' > ').slice(1).join(' > '));",
  `__indentWrite(${JSON.stringify(PROBE)}, JSON.stringify(__indentSeen)) });`
].join(' ')

async function seen(run) {
  try {
    return JSON.parse(await readFile(join(run.dir, PROBE), 'utf8'))
  } catch {
    return { set: 0, left: [] }
  }
}

const NAME = 'Every test puts the real clock back'
const args = [`--testTimeout=${limit}`, `--hookTimeout=${limit}`]
const leftAfter = (left) =>
  left.length
    ? `The clock was still fake after:\n${left.map((x) => `  ${x}`).join('\n')}`
    : 'The clock was real again after every test.'

async function cleanUp(t) {
  const code = await workingCode(t, target)
  const versions = [wrong.month, wrong.allDay, wrong.never]
  const runs = await Promise.all(
    [code, ...versions.map((w) => wrongVersion(code, w.change))].map((c) =>
      runTests(t, { test, target, code: c, before, steady: steady[0], args })
    )
  )
  const problem = fileProblem(test, runs[0])
  if (problem) return [problem]
  const [good, ...others] = await Promise.all(runs.map(seen))
  if (!good.set) {
    return [
      {
        name: 'Your tests set the clock',
        passed: false,
        message: 'None of your tests sets the clock yet, so there is nothing to put back. Write the tests of the first three tasks first: this task checks what they leave behind.',
        output: shortFailure(runs[0].output)
      }
    ]
  }
  const details = [
    {
      name: NAME,
      passed: !good.left.length,
      message: good.left.length
        ? `When "${good.left[0]}" ends, the clock is still fake, so any test after it runs on a day and time set for another test. Put the real clock back in afterEach, which runs after every test.`
        : undefined,
      output: leftAfter(good.left)
    }
  ]
  if (good.left.length) return details
  versions.forEach((w, i) => {
    const left = others[i].left
    details.push({
      name: `${NAME}, even when one fails on a version that ${w.label}`,
      passed: !left.length,
      message: left.length
        ? `On a version that ${w.label}, "${left[0]}" fails, and the clock stays fake after it. A test stops at the expect that fails, so a line at its end that puts the clock back never runs. Put the real clock back in afterEach, which runs even when a test fails.`
        : undefined,
      output: leftAfter(left)
    })
  })
  return details
}

export const checks = {
  day: task('delivery day', [wrong.late, wrong.month]),
  cutoff: task('cut-off', [wrong.early, wrong.hourLate, wrong.allDay]),
  hold: task('basket hold', [wrong.seconds, wrong.never, wrong.minute, wrong.minuteLate]),
  cleanup: cleanUp
}
