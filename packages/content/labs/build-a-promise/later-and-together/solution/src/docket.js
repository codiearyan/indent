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
      for (const handle of this.#waiting) queueMicrotask(handle)
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
      else queueMicrotask(handle)
    })
  }

  catch(onRejected) {
    return this.then(undefined, onRejected)
  }

  static all(dockets) {
    return new Docket((resolve, reject) => {
      const values = []
      let left = dockets.length
      if (left === 0) resolve(values)
      dockets.forEach((docket, i) => {
        docket.then((value) => {
          values[i] = value
          left -= 1
          if (left === 0) resolve(values)
        }, reject)
      })
    })
  }

  static race(dockets) {
    return new Docket((resolve, reject) => {
      for (const docket of dockets) docket.then(resolve, reject)
    })
  }
}
