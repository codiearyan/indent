// Ashgrove's own test runner. Nothing but plain JavaScript and Node.
//
// Task 1: Groups with names (describe)
// Task 2: Setup before each test (beforeEach)
// Task 3: Run only one test (test.only)
// Each task has a function at the bottom, and needs changes to test() and run() as well.
import { formatReport } from './report.js'

// Every test, in the order test() was called. Each one is { name, fn, timeout, hooks, only }.
export const tests = []

// The groups open right now, outermost first, each with its own beforeEach hooks.
const groups = []
const topHooks = []

function add(name, fn, options, only) {
  if (typeof name !== 'string' || name === '') throw new TypeError('A test needs a name')
  if (typeof fn !== 'function') throw new TypeError(`Test "${name}" needs a function`)
  tests.push({
    name: [...groups.map((group) => group.name), name].join(' > '),
    fn,
    timeout: options.timeout ?? 2000,
    // The lists themselves, so a hook added later in a group still applies.
    hooks: [topHooks, ...groups.map((group) => group.hooks)],
    only
  })
}

export function test(name, fn, options = {}) {
  add(name, fn, options, false)
}

function withTimeout(fn, ms) {
  let timer
  const limit = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms)
  })
  return Promise.race([(async () => fn())(), limit]).finally(() => clearTimeout(timer))
}

export async function run() {
  const chosen = tests.some((t) => t.only) ? tests.filter((t) => t.only) : tests
  const results = []
  for (const { name, fn, timeout, hooks } of chosen) {
    try {
      await withTimeout(async () => {
        for (const hook of hooks.flat()) await hook()
        await fn()
      }, timeout)
      results.push({ name, passed: true })
    } catch (error) {
      results.push({ name, passed: false, error })
    }
  }
  return results
}

export async function main() {
  const results = await run()
  if (results.length === 0) {
    console.log('No tests found')
    process.exitCode = 1
    return
  }
  console.log(formatReport(results))
  process.exitCode = results.every((result) => result.passed) ? 0 : 1
}

export function describe(name, fn) {
  groups.push({ name, hooks: [] })
  try {
    fn()
  } finally {
    groups.pop()
  }
}

export function beforeEach(fn) {
  ;(groups.length ? groups.at(-1).hooks : topHooks).push(fn)
}

test.only = function (name, fn, options = {}) {
  add(name, fn, options, true)
}
