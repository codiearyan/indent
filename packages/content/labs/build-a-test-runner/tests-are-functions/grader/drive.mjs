// Copied into the sandbox as .grader/drive.mjs. Drives the learner's runner with tests of its own.
import * as runner from '../src/runner.js'
import { earlier, needs, shown } from './helpers.mjs'

function tryTest(...args) {
  try {
    runner.test(...args)
    return { threw: false }
  } catch (err) {
    return { threw: true, typeError: err instanceof TypeError, error: shown(err) }
  }
}

const names = () => (Array.isArray(runner.tests) ? runner.tests.map((t) => t?.name) : null)

export function collectCase(mode) {
  const calls = []
  const first = () => calls.push('first')
  const second = () => calls.push('second')
  if (mode === 'order') {
    runner.test('ships on time', first)
    runner.test('counts the paper', second)
    const kept = Array.isArray(runner.tests) ? runner.tests : []
    return {
      isArray: Array.isArray(runner.tests),
      names: names(),
      sameFns: kept[0]?.fn === first && kept[1]?.fn === second,
      keptFns: kept.some((t) => t?.fn === first) && kept.some((t) => t?.fn === second),
      calls
    }
  }
  const attempt = {
    noFn: () => tryTest('totals'),
    emptyName: () => tryTest('', first),
    numberName: () => tryTest(42, first)
  }[mode]()
  return { ...attempt, names: names() }
}

// Registers the check's tests with task 1's test(), and says so plainly when that is not done.
function register(specs) {
  needs('This task needs test() from task 1, which does not work yet.', () => {
    for (const [name, fn] of specs) runner.test(name, fn)
  })
  if (!Array.isArray(runner.tests) || runner.tests.length !== specs.length) {
    earlier('This task needs test() from task 1, which does not add tests to the list yet.')
  }
}

const THROWN = {
  error: () => new Error('Price is 0'),
  string: () => 'out of card stock',
  object: () => ({ code: 'NO_PAPER' }),
  undefined: () => undefined,
  null: () => null,
  empty: () => ''
}

export function runCase(plan) {
  const calls = []
  const thrown = {}
  const specs = plan.map(([name, does]) => [
    name,
    () => {
      calls.push(name)
      if (does === 'false') return false
      if (does in THROWN) {
        thrown[name] = THROWN[does]()
        throw thrown[name]
      }
    }
  ])
  register(specs)
  const results = runner.run()
  if (!Array.isArray(results)) return { calls, notArray: true, got: shown(results) }
  return {
    calls,
    results: results.map((r) => ({
      name: r?.name,
      passed: r?.passed,
      hasError: r != null && Object.hasOwn(r, 'error'),
      error: r?.error === undefined && !(r != null && Object.hasOwn(r, 'error')) ? '(none)' : shown(r?.error),
      sameError: r != null && r.name in thrown ? r.error === thrown[r.name] : null
    }))
  }
}
