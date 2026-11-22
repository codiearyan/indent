// Ashgrove's own test runner. Nothing but plain JavaScript and Node.

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
