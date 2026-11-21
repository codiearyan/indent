// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.

export const describe = (err) => ({ name: err?.name ?? 'Error', message: err?.message ?? String(err) })

// Lets every queued callback and promise reaction run, so a driver can look at what happened.
export async function settle(rounds = 6) {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setImmediate(resolve))
}

export function track(value) {
  const state = { state: 'pending' }
  Promise.resolve(value).then(
    // Copied at the moment it settles, so later changes to the object do not count.
    (v) => Object.assign(state, { state: 'fulfilled', value: v === undefined ? null : JSON.parse(JSON.stringify(v)) }),
    (e) => Object.assign(state, { state: 'rejected', error: describe(e) })
  )
  return state
}

export function watchUnhandled() {
  const seen = []
  process.on('unhandledRejection', (err) => seen.push(describe(err)))
  return seen
}

export function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function fakeTimers() {
  const timers = []
  return {
    timers,
    setTimeout(fn, ms) {
      timers.push({ fn, ms, cleared: false, fired: false })
      return timers.length
    },
    clearTimeout(id) {
      if (timers[id - 1]) timers[id - 1].cleared = true
    },
    fire(index) {
      const timer = timers[index]
      timer.fired = true
      timer.fn()
    },
    report: () => timers.map(({ ms, cleared, fired }) => ({ ms, cleared, fired }))
  }
}

export const retryable = (message) => Object.assign(new Error(message), { retryable: true })
