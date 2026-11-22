// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.
import { inspect } from 'node:util'

export const shown = (value) =>
  value instanceof Error ? `${value.name}: ${value.message}` : inspect(value)

// A test the learner's runner did not wait for may reject after run() returned. Keep the process
// alive and remember it instead of crashing the case.
export const unhandled = []
process.on('unhandledRejection', (reason) => unhandled.push(shown(reason)))

function needsError(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  return error
}

/** Stops the case with a plain sentence about an earlier task when `fn` throws. */
export function needs(message, fn) {
  try {
    return fn()
  } catch (err) {
    throw needsError(`${message} It threw ${shown(err)}.`)
  }
}

export function earlier(message) {
  throw needsError(message)
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const never = () => new Promise(() => {})

/** Resolves with what `promise` gave, or with `{ hung: true }` after `ms`. */
export function within(ms, promise) {
  let timer
  const limit = new Promise((resolve) => (timer = setTimeout(() => resolve({ hung: true }), ms)))
  return Promise.race([Promise.resolve(promise).then((value) => ({ value })), limit]).finally(() =>
    clearTimeout(timer)
  )
}
