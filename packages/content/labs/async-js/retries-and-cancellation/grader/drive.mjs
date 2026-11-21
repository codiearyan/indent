// Copied into the sandbox as .grader/drive.mjs. Drives retry and sleep with a fake sleep and a fake clock.
import { retry } from '../src/retry.js'
import { sleep } from '../src/sleep.js'
import { deferred, fakeTimers, retryable, settle, track, watchUnhandled } from './helpers.mjs'

const unhandled = watchUnhandled()

const failure = (kind, attempt) =>
  kind === 'retry' ? retryable(`Harbour server busy (attempt ${attempt})`) : new Error('No such sailing')

// outcomes: 'retry', 'fatal' or 'ok' for each attempt in turn.
export async function backoffCase(outcomes, options = {}) {
  const attempts = []
  const sleeps = []
  const task = (arg) => {
    const attempt = arg?.attempt
    attempts.push(attempt)
    const kind = outcomes[attempts.length - 1] ?? 'ok'
    return kind === 'ok'
      ? Promise.resolve(`manifest on attempt ${attempt}`)
      : Promise.reject(failure(kind, attempt))
  }
  const fakeSleep = (ms) => {
    sleeps.push(ms)
    return new Promise((resolve) => setImmediate(resolve))
  }
  const outcome = track(retry(task, { ...options, sleep: fakeSleep }))
  await settle(20)
  return { attempts, sleeps, ...outcome, unhandled }
}

function spyOnListeners(signal) {
  const live = new Set()
  const add = signal.addEventListener.bind(signal)
  const remove = signal.removeEventListener.bind(signal)
  signal.addEventListener = (type, fn, opts) => {
    live.add(fn)
    add(type, fn, opts)
  }
  signal.removeEventListener = (type, fn, opts) => {
    live.delete(fn)
    remove(type, fn, opts)
  }
  return live
}

export async function sleepCase(scenario) {
  const clock = fakeTimers()
  const controller = new AbortController()
  const live = spyOnListeners(controller.signal)
  if (scenario === 'alreadyAborted') controller.abort()
  const options = { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout }
  if (scenario !== 'noSignal') options.signal = controller.signal
  const outcome = track(sleep(250, options))
  await settle()
  const before = { state: outcome.state, timers: clock.report() }
  if (scenario === 'abortDuring') controller.abort()
  if (scenario === 'customReason') controller.abort(new Error('Bram pressed cancel'))
  if ((scenario === 'noSignal' || scenario === 'cleanup') && clock.timers.length > 0) clock.fire(0)
  await settle()
  return { before, ...outcome, timers: clock.report(), listenersLeft: live.size, unhandled }
}

// The fake sleep behaves like a real one: it rejects when the signal it was given aborts,
// unless `ignoresAbort` is set, in which case the driver finishes it by hand.
export async function cancelCase(scenario) {
  const controller = new AbortController()
  const attempts = []
  const sleeps = []
  let attempt
  const task = (arg) => {
    attempts.push({ attempt: arg?.attempt, gotSignal: arg?.signal === controller.signal })
    attempt = deferred()
    return attempt.promise
  }
  let wake
  const fakeSleep = (ms, opts) => {
    sleeps.push({ ms, gotSignal: opts?.signal === controller.signal })
    const d = deferred()
    wake = d.resolve
    if (scenario !== 'sleepIgnoresAbort') {
      opts?.signal?.addEventListener('abort', () => d.reject(opts.signal.reason), { once: true })
    }
    return d.promise
  }
  if (scenario === 'before') controller.abort()
  const outcome = track(retry(task, { signal: controller.signal, sleep: fakeSleep }))
  await settle()
  if (scenario === 'duringAttempt') {
    controller.abort()
    await settle()
    attempt?.reject(retryable('Harbour server busy (attempt 1)'))
  }
  if (scenario === 'duringSleep' || scenario === 'sleepIgnoresAbort') {
    attempt?.reject(retryable('Harbour server busy (attempt 1)'))
    await settle()
    controller.abort()
    await settle()
    if (scenario === 'sleepIgnoresAbort') wake?.()
  }
  await settle()
  // Anything still waiting after the abort is let go, to catch work that starts late.
  attempt?.reject(retryable('Harbour server busy (late)'))
  wake?.()
  await settle()
  return { attempts, sleeps, ...outcome, unhandled }
}
