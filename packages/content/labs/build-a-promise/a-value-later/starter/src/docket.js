// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.
//
// Task 1: Keep or fail a docket. new Docket(executor) calls executor at once with two
//         functions, resolve and reject. resolve(value) keeps the docket: state becomes
//         'fulfilled' and value is that value. reject(reason) fails it: state becomes
//         'rejected' and value is that reason.
// Task 2: Settle once. After the first call to resolve or reject, every later call to
//         either one does nothing.
// Task 3: An executor that throws. The docket is rejected with exactly what was thrown,
//         and new Docket itself does not throw.

export class Docket {
  // 'pending' until the docket settles, then 'fulfilled' or 'rejected'.
  state = 'pending'
  // What the docket was kept with, or the reason it failed.
  value = undefined

  constructor(executor) {
    throw new Error('Not implemented')
  }
}
