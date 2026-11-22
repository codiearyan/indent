// Ashgrove's own test runner. Nothing but plain JavaScript and Node.
//
// This issue changes code you already have, so nothing here throws 'Not implemented'.
// Task 1: Wait for async tests. run() returns a promise of the results and waits for every
//         test's promise. A rejected promise is a failure, its error the rejection value.
//         main() waits for run() too.
// Task 2: One test at a time. A test starts only once the one before it has finished.
// Task 3: A time limit. test(name, fn, { timeout }) takes an optional time limit in ms,
//         2000 when not given. A test still running at its limit fails with an Error whose
//         message is 'Timed out after <ms> ms', and the next test runs. A quick test must not
//         leave its timer behind to keep the program open.
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
