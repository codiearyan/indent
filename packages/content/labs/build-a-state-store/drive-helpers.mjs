// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.
import { inspect } from 'node:util'

export const shown = (value) =>
  value instanceof Error
    ? `${value.name}: ${value.message}`
    : inspect(value, { depth: 4, breakLength: Infinity })

// A rejection or a throw that escaped the learner's code into a promise nobody waited for. Kept,
// not fatal, so the case can still say what it saw.
export const escaped = []
process.on('unhandledRejection', (error) => escaped.push(shown(error)))
process.on('uncaughtException', (error) => escaped.push(shown(error)))

function needsError(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  return error
}

export function earlier(message) {
  throw needsError(message)
}

/** Stops the case with a plain sentence about an earlier task when `fn` throws. */
export function needs(message, fn) {
  try {
    return fn()
  } catch (error) {
    if (error?.name === 'NeedsEarlierTask') throw error
    throw needsError(`${message} It threw ${shown(error)}.`)
  }
}

/** Calls fn and says whether it threw, without letting the throw stop the case. */
export function attempt(fn) {
  try {
    return { threw: false, value: fn() }
  } catch (error) {
    return { threw: true, typeError: error instanceof TypeError, error: shown(error) }
  }
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Resolves with what `promise` gave, `{ threw }` when it rejected, or `{ hung: true }` after `ms`. */
export function within(ms, promise) {
  let timer
  const limit = new Promise((resolve) => (timer = setTimeout(() => resolve({ hung: true }), ms)))
  return Promise.race([
    Promise.resolve(promise).then(
      (value) => ({ value }),
      (error) => ({ threw: shown(error) })
    ),
    limit
  ]).finally(() => clearTimeout(timer))
}

// More calls than any case makes on purpose: past this, a round is starting another round for ever.
const LIMIT = 200

/**
 * Wraps a case so the check's own listeners cannot be told for ever. `guard.listen(fn)` gives a
 * listener that counts its calls; past the limit it throws and the case answers `{ endless: true }`.
 */
export function guarded(run) {
  return async (...args) => {
    const guard = { calls: 0, tripped: false }
    guard.listen = (fn) =>
      function listener(...values) {
        guard.calls += 1
        if (guard.calls > LIMIT) {
          guard.tripped = true
          throw new Error('The check stopped a round that never ended.')
        }
        return fn(...values)
      }
    try {
      const value = await run(guard, ...args)
      return guard.tripped ? { endless: true } : value
    } catch (error) {
      if (guard.tripped || (error instanceof RangeError && guard.calls > 20)) return { endless: true }
      throw error
    }
  }
}
