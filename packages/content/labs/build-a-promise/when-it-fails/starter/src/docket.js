// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.
//
// Task 1: A throw in a callback. When onFulfilled or onRejected throws, the docket from
//         then() is rejected with exactly what was thrown, and the throw goes no further.
// Task 2: catch. catch(onRejected) works like then(undefined, onRejected). From now on,
//         what onRejected returns keeps the new docket, just as onFulfilled's does.
// Task 3: Errors skip ahead. When onRejected is missing, the docket from then() fails
//         with the same reason, so a failure passes every then() without one until a
//         callback takes it.

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
    return new Docket((resolve, reject) => {
      const handle = () => {
        if (this.state === 'rejected') {
          // Task 3 changes what happens to a failure.
          if (typeof onRejected === 'function') onRejected(this.value)
          return
        }
        if (typeof onFulfilled !== 'function') return resolve(this.value)
        const result = onFulfilled(this.value)
        if (result instanceof Docket) result.then(resolve, reject)
        else resolve(result)
      }
      if (this.state === 'pending') this.#waiting.push(handle)
      else handle()
    })
  }

  catch(onRejected) {
    throw new Error('Not implemented')
  }
}
