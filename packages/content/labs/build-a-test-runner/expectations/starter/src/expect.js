// Expectations for Ashgrove's tests: expect(value).toBe(...) and friends.
// Each method returns quietly when the expectation holds and throws an Error when it does not.
//
// Task 1: toBe
// Task 2: toEqual
// Task 3: toThrow
import { inspect } from 'node:util'

export function expect(actual) {
  return {
    // Task 1
    // Passes when actual and expected are the same value, as Object.is sees it.
    // Otherwise throws an Error whose message shows the expected value first and then the
    // value it got, each written with inspect(), like: Expected 4500 but got 4050
    toBe(expected) {
      throw new Error('Not implemented')
    },

    // Task 2
    // Like toBe, but arrays and plain objects are equal when they hold equal values:
    // the same keys (in any order) and, for each key, equal values, all the way down.
    // An array never equals an object that is not an array. Same message as toBe.
    toEqual(expected) {
      throw new Error('Not implemented')
    },

    // Task 3
    // actual is a function. Call it once. Passes when it throws anything.
    // When it returns instead, throw an Error: Expected the function to throw
    // When text is given, the thrown error's message must include it. When it does not,
    // throw an Error like: Expected an error with 'Unknown item' but got 'Price missing'
    toThrow(text) {
      throw new Error('Not implemented')
    }
  }
}
