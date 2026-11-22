// Ashgrove's own docket: a value that arrives later.
// Plain JavaScript and Node. No built-in Promise, no async and no await in this file.

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
}
