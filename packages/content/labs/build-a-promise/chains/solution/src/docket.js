// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.

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
          // Failures go further in the next issue.
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
}
