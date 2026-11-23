// Tools for measuring the report before changing it.
//
// Task 1: Time a function fairly. timeIt(fn, runs) runs fn once without timing it, then times
//         it `runs` times with performance.now(), and returns the middle of those times.
// Task 2: Find the slow step. timeSteps(steps, runs) times each step of an object of steps with
//         timeIt, one after another, and returns [{ name, ms }], the slowest first.
// Task 3: Count the work. counted(fn) returns a function that does what fn does and keeps the
//         number of times it was called in its `calls` property.

export async function timeIt(fn, runs = 5) {
  throw new Error('Not implemented')
}

export async function timeSteps(steps, runs = 5) {
  throw new Error('Not implemented')
}

export function counted(fn) {
  throw new Error('Not implemented')
}
