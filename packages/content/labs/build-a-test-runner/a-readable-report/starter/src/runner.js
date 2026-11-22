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

// Task 3
// main() runs every test and prints formatReport(results) with console.log. Then it sets
// process.exitCode to 0 when every test passed and to 1 when any failed. When there are no
// tests at all it prints 'No tests found' instead, and sets process.exitCode to 1.
export function main() {
  throw new Error('Not implemented')
}
