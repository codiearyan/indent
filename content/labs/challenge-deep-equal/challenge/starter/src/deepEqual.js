// Deep equal
//
// deepEqual(a, b) returns true when a and b have the same structure and contents.
//
// Task 1: primitives, arrays and plain objects
// - Primitives are equal when Object.is says so: NaN equals NaN, but 0 and -0 differ.
// - Arrays are equal when they have the same length and equal items in the same order.
// - Plain objects are equal when they have the same own keys, in any order, with equal values.
//   A key holding undefined is not the same as a missing key.
// - Values of different kinds are never equal: an array is not an object, null is not {}.
//
// Task 2: dates, maps and sets
// - Dates are equal when they hold the same time. Two invalid dates are equal.
// - Maps are equal when they have the same keys (found with has) and deeply equal values.
// - Sets are equal when they have the same members (found with has). Order does not matter.
// - A Date, Map or Set is never equal to a value of another kind, such as a plain object.
//
// Task 3: cycles
// - Values may refer to themselves, directly or through other objects. deepEqual must not
//   recurse forever, and must still find differences inside cyclic structures.
// - The same object can appear in many places without any cycle. Each place is still compared.
// - The check compares structures with 100,000 objects, so remembering what you have seen
//   must be cheap.
export function deepEqual(a, b) {
  throw new Error('Not implemented')
}
