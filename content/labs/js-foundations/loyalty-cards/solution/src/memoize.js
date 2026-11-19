// Task: Remember slow answers
//
// memoize(fn) returns a new function of one argument that gives the same result as fn,
// but calls fn at most once for each distinct argument and reuses the saved result after that.
// - arguments are distinct the way a Map sees them, so 1 and '1' are different
// - results like 0, '' and undefined are saved too
// - every memoized function has its own memory
export function memoize(fn) {
  const cache = new Map()
  return (arg) => {
    if (!cache.has(arg)) cache.set(arg, fn(arg))
    return cache.get(arg)
  }
}
