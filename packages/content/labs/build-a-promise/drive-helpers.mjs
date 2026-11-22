// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.
// The drivers wait with timers and read a docket's state; they never wait on a docket itself,
// so one that never settles cannot hang a case.
import { inspect } from 'node:util'

export function shown(value) {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (value?.constructor?.name === 'Docket') return `a Docket (${value.state}, ${shown(value.value)})`
  return inspect(value, { depth: 2 })
}

// A throw that escaped the learner's code into a timer or a queued job. Kept, not fatal.
export const escaped = []
process.on('uncaughtException', (error) => escaped.push(shown(error)))

function needsError(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  return error
}

export function earlier(message) {
  throw needsError(message)
}

export const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

/** Calls fn and says whether it threw, without letting the throw stop the case. */
export function attempt(fn) {
  try {
    return { threw: false, value: fn() }
  } catch (error) {
    return { threw: true, error: shown(error) }
  }
}

/** What a docket looks like now: its state, its value, and whether that is `expected` itself. */
export function look(docket, expected) {
  return {
    state: docket?.state,
    value: shown(docket?.value),
    same: docket?.value === expected
  }
}
