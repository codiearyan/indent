// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.
//
// This issue changes code you already have, so nothing here throws 'Not implemented'.
// Task 1: A new docket. then() returns a new Docket every time, never the one it was
//         called on. It stays pending until this docket is kept and onFulfilled has run,
//         and then it is kept too.
// Task 2: Values flow on. The new docket is kept with what onFulfilled returned. When
//         onFulfilled is missing, it is kept with this docket's value, unchanged.
// Task 3: Returned dockets are waited for. When onFulfilled returns a Docket, the new
//         docket waits for it and settles the same way: kept with its value, or failed
//         with its reason.
// Failures go further in the next issue. For now onRejected runs as before.

export class Docket {
  // 'pending' until the docket settles, then 'fulfilled' or 'rejected'.
  state = 'pending'
  // What the docket was kept with, or the reason it failed.
  value = undefined
  // Callbacks waiting for the docket to settle, in the order then() was called.
  #waiting = []

  constructor(executor) {
    const settle = (state, value) => {
      if (this.state !== 'pending') return
      this.state = state
      this.value = value
      for (const handle of this.#waiting) handle()
      this.#waiting = []
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
    const handle = () => {
      const callback = this.state === 'fulfilled' ? onFulfilled : onRejected
      if (typeof callback === 'function') callback(this.value)
    }
    if (this.state === 'pending') this.#waiting.push(handle)
    else handle()
  }
}
