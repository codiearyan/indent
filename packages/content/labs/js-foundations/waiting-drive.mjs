// Copied into the sandbox of every issue of "Waiting on the world" as .grader/waiting.mjs, beside
// the issue's grader/drive.mjs. It gives a case the check's own clock and slow machines: nothing
// waits on real time. setTimeout is replaced by a clock that only moves when the case runs it,
// and every call to a machine of the shop waits until the case answers it. So the order in which
// things happen is exact, the same on every run, and a promise still pending once nothing is left
// to answer or to run can never settle.
import { format, inspect } from 'node:util'

const OPTIONS = { depth: 4, breakLength: Infinity }
export const show = (v) => inspect(v, OPTIONS)

/** The value as JSON keeps it, or undefined when JSON would change it (a promise, undefined, NaN). */
function plain(v) {
  try {
    const text = JSON.stringify(v)
    if (text === undefined) return undefined
    const back = JSON.parse(text)
    return show(back) === show(v) ? back : undefined
  } catch {
    return undefined
  }
}

const errorText = (e) => (e instanceof Error ? `${e.name}: ${e.message}` : show(e))

/** Lets every promise reaction that can run, run. Nothing else is waiting, so a few rounds do. */
async function settle() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve))
}

function received(v) {
  if (v === undefined || v === null) return `Received ${v}`
  if (typeof v === 'function') return `Received function ${v.name}`
  if (typeof v === 'object') return `Received an instance of ${v.constructor?.name ?? 'Object'}`
  return `Received type ${typeof v} (${show(v)})`
}

/** What the check's setTimeout gives back: like Node's, an object that names one timer. */
class Timeout {
  constructor(id) {
    this.id = id
  }
}

export function stage() {
  const log = []
  const calls = []
  const timers = []
  const unhandled = []
  const thrown = []
  let now = 0
  let answers = 0
  let inFlightMax = 0
  const note = (line) => log.push(line)

  process.on('unhandledRejection', (e) => {
    unhandled.push(errorText(e))
    note(`a promise failed and nothing caught it: ${errorText(e)}`)
  })
  console.log = (...parts) => note(`printed: ${format(...parts)}`)

  globalThis.setTimeout = function setTimeout(fn, ms, ...args) {
    if (typeof fn !== 'function') {
      const error = new TypeError(`The "callback" argument must be of type function. ${received(fn)}`)
      error.code = 'ERR_INVALID_ARG_TYPE'
      note(`setTimeout was handed ${show(fn)} in place of a function, and stopped with an error`)
      throw error
    }
    const wait = Number(ms) > 0 ? Number(ms) : 0
    const handle = new Timeout(timers.length + 1)
    const timer = { id: handle.id, handle, ms: ms === undefined ? 0 : ms, due: now + wait, fn, args, state: 'waiting' }
    timers.push(timer)
    note(`a timer was set for ${show(timer.ms)} ms`)
    return handle
  }
  globalThis.clearTimeout = function clearTimeout(handle) {
    const timer = timers.find((x) => x.handle === handle && x.state === 'waiting')
    if (!timer) return
    timer.state = 'stopped'
    note(`the ${show(timer.ms)} ms timer was stopped`)
  }

  /** Runs `fn`, noting a throw instead of letting it stop the case. */
  function guard(fn, where) {
    try {
      return fn()
    } catch (e) {
      thrown.push(errorText(e))
      note(`${where} stopped with ${errorText(e)}`)
      return undefined
    }
  }

  const s = {
    log,
    calls,
    timers,
    show,

    /** Imports the learner's file. Returns the module, or null with the problem noted. */
    async load(path, names) {
      try {
        const mod = await import(path)
        s.missing = names.filter((n) => typeof mod[n] !== 'function')
        return s.missing.length ? null : mod
      } catch (e) {
        s.loadError = errorText(e)
        return null
      }
    },

    /**
     * A slow machine of the shop. `answer(args, n)` gives { value } or { error } for its n-th
     * call. With `callback`, the machine is handed a function as its last argument and calls it
     * with the answer, the old way; otherwise it gives back a promise.
     */
    machine(name, answer, { callback = false } = {}) {
      return (...args) => {
        const handed = callback && typeof args.at(-1) === 'function'
        const given = handed ? args.slice(0, -1) : args
        const call = {
          name,
          args: given,
          n: calls.filter((c) => c.name === name).length,
          startedAfter: answers,
          state: 'waiting'
        }
        calls.push(call)
        note(`${name}(${given.map(show).join(', ')}) started`)
        inFlightMax = Math.max(inFlightMax, calls.filter((c) => c.state === 'waiting').length)
        if (callback) {
          const done = handed ? args.at(-1) : undefined
          call.reply = (a) => {
            if (typeof done !== 'function') {
              note(`${name} had no function to call back with its answer, so the answer went nowhere`)
              return
            }
            const back = guard(() => done(a.value), `the function handed to ${name}`)
            if (back !== undefined) {
              note(`the function handed to ${name} gave back ${show(back)}, and ${name} does nothing with it`)
            }
          }
          return undefined
        }
        return new Promise((resolve, reject) => {
          call.reply = (a) => ('error' in a ? reject(new Error(a.error)) : resolve(a.value))
        })
      }
    },

    /** A function the case hands to the learner's code, that notes every call. */
    spy(name, gives) {
      const seen = []
      const fn = (...args) => {
        seen.push({ args, afterAnswers: answers })
        note(`${name} was called with ${args.length ? args.map(show).join(', ') : 'nothing'}`)
        return gives
      }
      fn.calls = seen
      return fn
    },

    /** Calls the learner's function and notes what it gave back, or how it stopped. */
    call(label, fn) {
      s.calledAt = log.length
      const value = guard(fn, label)
      if (thrown.length === 0) note(`${label} gave back ${show(value)}`)
      return value
    },

    /** Follows a promise; its state, value or error are in the report. */
    track(label, value) {
      const outcome = { state: value instanceof Promise ? 'pending' : 'not a promise' }
      s.outcome = outcome
      if (!(value instanceof Promise)) return outcome
      value.then(
        (v) => {
          Object.assign(outcome, { state: 'fulfilled', shown: show(v), json: plain(v) })
          note(`the promise from ${label} was fulfilled with ${show(v)}`)
        },
        (e) => {
          Object.assign(outcome, {
            state: 'rejected',
            error: e instanceof Error ? { name: e.name, message: e.message } : { name: '', message: show(e) }
          })
          note(`the promise from ${label} was rejected with ${errorText(e)}`)
        }
      )
      return outcome
    },

    /** Answers one waiting call, chosen by `pick` from the waiting ones, with its answer. */
    async answer(pick = (waiting) => waiting[0]) {
      await settle()
      const waiting = calls.filter((c) => c.state === 'waiting')
      if (!waiting.length) return false
      const call = pick(waiting)
      call.state = 'answered'
      answers += 1
      const a = call.answerWith
      note(
        'error' in a
          ? `${call.name}(${call.args.map(show).join(', ')}) failed with Error: ${a.error}`
          : `${call.name}(${call.args.map(show).join(', ')}) answered ${show(a.value)}`
      )
      call.reply(a)
      await settle()
      return true
    },

    /** Runs the timer that is due first, moving the clock to it. */
    async tick() {
      await settle()
      const due = timers
        .filter((x) => x.state === 'waiting')
        .sort((a, b) => a.due - b.due || a.id - b.id)[0]
      if (!due) return false
      now = due.due
      due.state = 'ran'
      note(`the ${show(due.ms)} ms timer ran`)
      guard(() => due.fn(...due.args), `the function the ${show(due.ms)} ms timer ran`)
      await settle()
      return true
    },

    /**
     * Answers every call and runs every timer until nothing is left, at most `limit` steps.
     * `order` picks which waiting call is answered first: 'oldest' or 'newest'.
     */
    async run({ order = 'oldest', limit = 60 } = {}) {
      for (let step = 0; step < limit; step++) {
        const pick = order === 'newest' ? (w) => w.at(-1) : (w) => w[0]
        if (await s.answer(pick)) continue
        if (await s.tick()) continue
        return
      }
      s.endless = true
      note('Check stopped here: the code kept starting new waits')
    },

    report(extra = {}) {
      return {
        log,
        loadError: s.loadError,
        missing: s.missing,
        thrown,
        unhandled,
        endless: Boolean(s.endless),
        outcome: s.outcome,
        inFlightMax,
        calls: calls.map(({ name, args, n, startedAfter, state }) => ({
          name,
          args: args.map(show),
          n,
          startedAfter,
          state
        })),
        timers: timers.map(({ ms, state }) => ({ ms: show(ms), state })),
        ...extra
      }
    }
  }

  /** Installs the shop's machines where the check's src/shop.js looks for them. */
  s.shop = (machines) => {
    globalThis.__shop = {}
    for (const [name, { answer, callback, now }] of Object.entries(machines)) {
      if (now) {
        globalThis.__shop[name] = (...args) => {
          calls.push({ name, args, n: calls.filter((c) => c.name === name).length, startedAfter: answers, state: 'now' })
          note(`${name}(${args.map(show).join(', ')}) was called`)
        }
        continue
      }
      const make = s.machine(name, answer, { callback })
      globalThis.__shop[name] = (...args) => {
        const result = make(...args)
        const call = calls.at(-1)
        call.answerWith = answer(call.args, call.n)
        return result
      }
    }
  }

  return s
}

/**
 * The usual case: installs the machines, calls `fn` from `file` with `args`, follows the promise
 * it gives back, and answers and runs everything until nothing is left.
 */
export async function promiseCase(file, fn, args, machines = {}, { order } = {}) {
  const s = stage()
  s.shop(machines)
  const mod = await s.load(file, [fn])
  if (!mod) return s.report()
  const back = s.call(fn, () => mod[fn](...args))
  s.track(fn, back)
  await s.run({ order })
  return s.report()
}

/** A machine that answers from a table, and fails with `missing(key)` for a key it does not have. */
export const table = (values, missing, { callback = false } = {}) => ({
  callback,
  answer: ([key]) => (key in values ? { value: values[key] } : { error: missing(key) })
})
