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
  return equal(a, b, new Map())
}

// seen maps each object on the left to the objects on the right it is being compared with.
// A pair met again is assumed equal: if it were not, the first comparison will say so.
function equal(a, b, seen) {
  if (Object.is(a, b)) return true
  if (!isObject(a) || !isObject(b)) return false
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false
  let partners = seen.get(a)
  if (partners?.has(b)) return true
  if (!partners) {
    partners = new Set()
    seen.set(a, partners)
  }
  partners.add(b)
  if (a instanceof Date) return Object.is(a.getTime(), b.getTime())
  if (a instanceof Map) return equalMaps(a, b, seen)
  if (a instanceof Set) return a.size === b.size && [...a].every((member) => b.has(member))
  if (Array.isArray(a)) return a.length === b.length && a.every((item, i) => equal(item, b[i], seen))
  return equalObjects(a, b, seen)
}

function isObject(value) {
  return typeof value === 'object' && value !== null
}

function equalMaps(a, b, seen) {
  if (a.size !== b.size) return false
  for (const [key, value] of a) {
    if (!b.has(key) || !equal(value, b.get(key), seen)) return false
  }
  return true
}

function equalObjects(a, b, seen) {
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key], seen))
}
