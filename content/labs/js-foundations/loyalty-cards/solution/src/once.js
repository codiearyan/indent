// Task: Only once
//
// once(fn) returns a new function. The first time it is called it calls fn with the same
// arguments and returns fn's result. Every later call returns that first result again
// without calling fn, whatever arguments it gets. This holds even when fn returned undefined.
export function once(fn) {
  let called = false
  let result
  return (...args) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
