// Tools for measuring the report before changing it.
//
// Task 1: Time a function fairly. timeIt(fn, runs) runs fn once without timing it, then times
//         it `runs` times with performance.now(), and returns the middle of those times.
// Task 2: Find the slow step. timeSteps(steps, runs) times each step of an object of steps with
//         timeIt, one after another, and returns [{ name, ms }], the slowest first.
// Task 3: Count the work. counted(fn) returns a function that does what fn does and keeps the
//         number of times it was called in its `calls` property.
//
// From the second issue:
// How it grows. growth(stepsFor, n) asks stepsFor for the number of steps at n and at
// 2 * n, and says whether doubling the size leaves it the 'same', makes it 'twice' as
// many or 'four times' as many.

export async function timeIt(fn, runs = 5) {
  await fn()
  const times = []
  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    await fn()
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  return times[Math.floor(runs / 2)]
}

export async function timeSteps(steps, runs = 5) {
  const timed = []
  for (const [name, step] of Object.entries(steps)) {
    timed.push({ name, ms: await timeIt(step, runs) })
  }
  return timed.sort((a, b) => b.ms - a.ms)
}

export function counted(fn) {
  function wrapped(...args) {
    wrapped.calls += 1
    return fn(...args)
  }
  wrapped.calls = 0
  return wrapped
}

export function growth(stepsFor, n) {
  const ratio = stepsFor(2 * n) / stepsFor(n)
  if (ratio < 1.5) return 'same'
  if (ratio < 3) return 'twice'
  return 'four times'
}
