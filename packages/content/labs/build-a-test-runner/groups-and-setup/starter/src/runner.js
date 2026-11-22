// Ashgrove's own test runner. Nothing but plain JavaScript and Node.
//
// Task 1: Groups with names (describe)
// Task 2: Setup before each test (beforeEach)
// Task 3: Run only one test (test.only)
// Each task has a function at the bottom, and needs changes to test() and run() as well.
import { formatReport } from './report.js'

// Every test, in the order test() was called. Each one is { name, fn, timeout }.
export const tests = []

export function test(name, fn, options = {}) {
  if (typeof name !== 'string' || name === '') throw new TypeError('A test needs a name')
  if (typeof fn !== 'function') throw new TypeError(`Test "${name}" needs a function`)
  tests.push({ name, fn, timeout: options.timeout ?? 2000 })
}

function withTimeout(fn, ms) {
  let timer
  const limit = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms)
  })
  return Promise.race([(async () => fn())(), limit]).finally(() => clearTimeout(timer))
}

export async function run() {
  const results = []
  for (const { name, fn, timeout } of tests) {
    try {
      await withTimeout(fn, timeout)
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

// Task 1
// describe(name, fn) calls fn straight away. Every test added while fn runs belongs to the
// group: its name becomes '<group> > <test>'. Groups can sit inside groups:
// 'quote > cards > 100 in one colour'. Tests added after the group are not in it.
export function describe(name, fn) {
  throw new Error('Not implemented')
}

// Task 2
// beforeEach(fn) inside a group runs fn before every test of that group, including tests in
// groups inside it and tests written above it. Outside any group, it runs before every test.
// Outer hooks run before inner ones. Async hooks are waited for. When a hook throws, the test
// fails with that error and its own function does not run.
export function beforeEach(fn) {
  throw new Error('Not implemented')
}

// Task 3
// test.only(name, fn, options) adds a test just like test(). When at least one test was added
// with test.only, run() runs only those, and only they are in the results.
test.only = function (name, fn, options) {
  throw new Error('Not implemented')
}
