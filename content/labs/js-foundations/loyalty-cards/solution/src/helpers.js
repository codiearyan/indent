// Small helpers for the loyalty cards and the shop's emails. One function per task, in order.

// Task 1: A stamp card that remembers
//
// createStampCard(goal) returns a card object with two methods:
// - stamp(): adds one stamp. When the card reaches `goal` stamps it returns true (a free candle)
//   and the card starts again from 0. Otherwise it returns false.
// - stamps(): returns how many stamps the card holds right now.
// Every card keeps its own count.
export function createStampCard(goal) {
  let count = 0
  return {
    stamp() {
      count += 1
      if (count < goal) return false
      count = 0
      return true
    },
    stamps() {
      return count
    }
  }
}

// Task 2: Remember slow answers
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

// Task 3: Only once
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
