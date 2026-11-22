// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.
//
// Task 1: Always later. A callback never runs during then() or resolve(). It runs once the
//         code that is running now has finished, before any timer, and callbacks run in
//         the order then() was called. Use queueMicrotask. The executor still runs at once.
// Task 2: Docket.all(dockets) returns a docket kept with every value, in the order of the
//         list, once all of them are kept. It fails as soon as one fails, with that reason.
//         An empty list gives an empty array.
// Task 3: Docket.race(dockets) returns a docket that settles the way the first of them to
//         settle does. The ones that settle after it change nothing.

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
        const kept = this.state === 'fulfilled'
        const callback = kept ? onFulfilled : onRejected
        if (typeof callback !== 'function') return kept ? resolve(this.value) : reject(this.value)
        try {
          const result = callback(this.value)
          if (result instanceof Docket) result.then(resolve, reject)
          else resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      if (this.state === 'pending') this.#waiting.push(handle)
      else handle()
    })
  }

  catch(onRejected) {
    return this.then(undefined, onRejected)
  }

  static all(dockets) {
    throw new Error('Not implemented')
  }

  static race(dockets) {
    throw new Error('Not implemented')
  }
}
