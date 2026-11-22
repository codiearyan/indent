// Ashgrove's own test runner. Nothing but plain JavaScript and Node.
//
// Task 1: Keep a list of tests (test)
// Task 2: Run every test (run)
// Task 3: Keep what each test threw (run)

// Every test, in the order test() was called. Each one is { name, fn }.
export const tests = []

// Task 1
// test(name, fn) adds { name, fn } to the end of `tests`. It does not call fn.
// It throws a TypeError when name is not a non-empty string or fn is not a function,
// and then adds nothing.
export function test(name, fn) {
  throw new Error('Not implemented')
}

// Tasks 2 and 3
// run() calls the function of every test, in order, and returns one result per test:
// { name, passed }. A test passes when its function returns, whatever it returns, and
// fails when it throws. One failure does not stop the others.
// Task 3: a failed result also has `error`, exactly what was thrown, whatever it was.
export function run() {
  throw new Error('Not implemented')
}
