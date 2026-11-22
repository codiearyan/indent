// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.
//
// Task 1: Callbacks that wait. then(onFulfilled, onRejected) on a pending docket keeps
//         both callbacks. When the docket is kept, onFulfilled(value) runs; when it fails,
//         onRejected(reason) runs. Only the matching one, and only once.
// Task 2: Already settled. then() on a docket that is already kept or failed runs the
//         matching callback with its value too.
// Task 3: Many callbacks. Every then() on one docket gets its turn, in the order the
//         then() calls were made, each once. A callback that is missing or not a function
//         is skipped without an error.
// then() does not need to return anything yet.

export class Docket {
  // 'pending' until the docket settles, then 'fulfilled' or 'rejected'.
  state = 'pending'
  // What the docket was kept with, or the reason it failed.
  value = undefined

  constructor(executor) {
    const settle = (state, value) => {
      if (this.state !== 'pending') return
      this.state = state
      this.value = value
    }
    try {
      executor(
        (value) => settle('fulfilled', value),
        (reason) => settle('rejected', reason)
      )
    } catch (error) {
      settle('rejected', error)
    }
  }

  then(onFulfilled, onRejected) {
    throw new Error('Not implemented')
  }
}
