// Ashgrove's own test runner. Nothing but plain JavaScript and Node.
//
// Task 3 of this issue: main(), at the bottom.
import { formatReport } from './report.js'

// Every test, in the order test() was called. Each one is { name, fn }.
export const tests = []

export function test(name, fn) {
  if (typeof name !== 'string' || name === '') throw new TypeError('A test needs a name')
  if (typeof fn !== 'function') throw new TypeError(`Test "${name}" needs a function`)
  tests.push({ name, fn })
}

export function run() {
  const results = []
  for (const { name, fn } of tests) {
    try {
      fn()
      results.push({ name, passed: true })
    } catch (error) {
      results.push({ name, passed: false, error })
    }
  }
  return results
}

export function main() {
  const results = run()
  if (results.length === 0) {
    console.log('No tests found')
    process.exitCode = 1
    return
  }
  console.log(formatReport(results))
  process.exitCode = results.every((result) => result.passed) ? 0 : 1
}
