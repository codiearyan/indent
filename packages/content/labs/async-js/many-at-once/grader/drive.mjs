// Copied into the sandbox as .grader/drive.mjs. Drives the learner's functions with fake services and a fake clock.
import { loadRoutes } from '../src/loadRoutes.js'
import { portStatus } from '../src/portStatus.js'
import { withTimeout } from '../src/withTimeout.js'
import { deferred, fakeTimers, settle, track, watchUnhandled } from './helpers.mjs'

const unhandled = watchUnhandled()

// Calls `run(fake)` with a fake service whose answers the driver settles in `order`.
async function controlled(run, order, answer) {
  const started = []
  const pending = {}
  const fake = (key) => {
    started.push(key)
    pending[key] = deferred()
    return pending[key].promise
  }
  const result = run(fake)
  const outcome = track(result)
  await settle()
  const startedFirst = [...started]
  for (const key of order) {
    if (!pending[key]) continue
    const [ok, value] = answer(key)
    if (ok) pending[key].resolve(value)
    else pending[key].reject(new Error(value))
    await settle()
  }
  return { isPromise: result instanceof Promise, startedFirst, started, ...outcome, unhandled }
}

const MINUTES = { 'quay-gull': 25, 'quay-heron': 40, 'gull-heron': 30 }

export function routesCase(ids, order, closed) {
  return controlled(
    (fake) => loadRoutes(ids, fake),
    order,
    (id) => (id === closed ? [false, `Route ${id} is closed`] : [true, { id, minutes: MINUTES[id] }])
  )
}

export function portsCase(ports, order, down) {
  return controlled(
    (fake) => portStatus(ports, fake),
    order,
    (port) => (down.includes(port) ? [false, `No answer from ${port}`] : [true, port.length * 10])
  )
}

export async function timeoutCase(scenario) {
  const clock = fakeTimers()
  const work = deferred()
  const result = withTimeout(work.promise, 500, clock)
  const outcome = track(result)
  await settle()
  const before = { state: outcome.state, timers: clock.report() }
  if (scenario === 'resolves') work.resolve('on time')
  if (scenario === 'rejects') work.reject(new Error('Gauge broke'))
  if (scenario === 'timesOut' && clock.timers.length > 0) {
    clock.fire(0)
    await settle()
    work.reject(new Error('Late failure'))
  }
  await settle()
  return { isPromise: result instanceof Promise, before, ...outcome, timers: clock.report(), unhandled }
}
