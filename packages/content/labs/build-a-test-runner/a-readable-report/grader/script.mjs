// Copied into the sandbox as .grader/script.mjs and run as a program: node .grader/script.mjs <plan>
// Adds the check's tests and calls the learner's main(), like a test file does.
import * as runner from '../src/runner.js'
import { formatReport } from '../src/report.js'
import { needs } from './helpers.mjs'

const ok = () => {}
const bad = () => {
  throw new Error('Expected 1900 but got 1400')
}
const PLANS = {
  pass: [['counts the setup', ok], ['checks the paper', ok]],
  fail: [['counts the setup', ok], ['prices a poster', bad], ['checks the paper', ok]],
  twoFail: [['prices a poster', bad], ['prices a card', bad]],
  none: []
}

const plan = PLANS[process.argv[2]]
for (const [name, fn] of plan) runner.test(name, fn)
if (plan.length) {
  // What main() should print: the learner's own report of these results.
  const expected = needs(
    'This task needs formatReport() from tasks 1 and 2, which does not work yet.',
    () => formatReport(runner.run())
  )
  process.stderr.write(`EXPECTED ${JSON.stringify(expected)}\n`)
}
runner.main()
