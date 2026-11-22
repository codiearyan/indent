// Expectations for Ashgrove's tests: expect(value).toBe(...) and friends.
// Each method returns quietly when the expectation holds and throws an Error when it does not.
//
// Task 1: toBe
// Task 2: toEqual
// Task 3: toThrow
import { inspect } from 'node:util'

function fail(expected, actual) {
  throw new Error(`Expected ${inspect(expected)} but got ${inspect(actual)}`)
}

function equals(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.hasOwn(b, key) && equals(a[key], b[key]))
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) fail(expected, actual)
    },

    toEqual(expected) {
      if (!equals(actual, expected)) fail(expected, actual)
    },

    toThrow(text) {
      let thrown
      try {
        actual()
      } catch (error) {
        thrown = { error }
      }
      if (!thrown) throw new Error('Expected the function to throw')
      if (text !== undefined && !String(thrown.error?.message).includes(text)) {
        throw new Error(`Expected an error with ${inspect(text)} but got ${inspect(thrown.error?.message)}`)
      }
    }
  }
}
