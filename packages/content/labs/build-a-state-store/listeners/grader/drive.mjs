// Copied into the sandbox as .grader/drive.mjs. Drives the learner's store with states and
// listeners of its own. Every case runs in its own process with fresh stores, and every listener
// the check adds is counted, so a round that never ends is stopped and named.
import * as lib from '../src/store.js'
import { attempt, earlier, guarded, needs } from './helpers.mjs'

const START = { stock: 'linen', ink: 'black', lines: ['menu', 'tag'], jobs: 2 }

// Tasks 2 and 3 first make sure a listener hears about a change, so they can say plainly when
// task 1 is not done.
function ready(guard) {
  const store = lib.createStore({ ...START })
  let heard = 0
  const stop = needs('This task needs subscribe() from task 1, which does not work yet.', () =>
    store.subscribe(guard.listen(() => (heard += 1)))
  )
  if (typeof stop !== 'function') earlier('This task needs task 1 first: subscribe() does not return a stop function yet.')
  store.setState({ jobs: 3 })
  if (heard !== 1) earlier('This task needs task 1 first: a listener is not told once after a change yet.')
  store.setState((state) => ({ jobs: state.jobs + 1 }))
  if (heard !== 2) earlier('This task needs task 1 first: a change made with a function does not tell the listeners yet.')
  stop()
  store.setState({ jobs: 9 })
  if (heard !== 2) earlier('This task needs task 1 first: a stopped listener is still told.')
  return lib.createStore({ ...START })
}

export const subscribeCase = guarded((guard, kind) => {
  const store = lib.createStore({ ...START })
  const log = []
  const listen = (name) => guard.listen(() => log.push(name))
  if (kind === 'told') {
    const before = store.getState()
    const calls = []
    store.subscribe(guard.listen((state, previous) => calls.push({ state, previous, now: store.getState() })))
    store.setState({ stock: 'kraft' })
    const after = store.getState()
    return {
      count: calls.length,
      state: calls[0]?.state,
      newState: calls[0]?.state === after,
      oldState: calls[0]?.previous === before,
      readNew: calls[0]?.now === after
    }
  }
  if (kind === 'order') {
    store.subscribe(listen('header'))
    store.subscribe(listen('basket'))
    store.subscribe(listen('total'))
    store.setState({ ink: 'blue' })
    log.push('|')
    store.setState((state) => ({ jobs: state.jobs + 1 }))
    return { log }
  }
  if (kind === 'stop') {
    store.subscribe(listen('header'))
    const stop = store.subscribe(listen('total'))
    const returned = typeof stop
    if (returned === 'function') stop()
    store.setState({ ink: 'blue' })
    return { returned, log }
  }
  const bad = [attempt(() => store.subscribe('header')), attempt(() => store.subscribe(undefined))]
  return { bad }
})

export const unchangedCase = guarded((guard, kind) => {
  const store = ready(guard)
  const log = []
  store.subscribe(guard.listen(() => log.push('told')))
  const before = store.getState()
  if (kind === 'same') {
    store.setState({ stock: 'linen' })
    store.setState({ stock: 'linen', ink: 'black' })
    return { log, sameObject: store.getState() === before }
  }
  if (kind === 'oneKey') {
    store.setState({ stock: 'linen', ink: 'red' })
    return { log, state: store.getState() }
  }
  if (kind === 'fn') {
    store.setState((state) => ({ jobs: state.jobs }))
    store.setState(() => ({}))
    return { log, sameObject: store.getState() === before }
  }
  if (kind === 'identity') {
    store.setState((state) => ({ lines: [...state.lines] }))
    return { log, newLines: store.getState().lines !== before.lines }
  }
  if (kind === 'nan') {
    const nan = lib.createStore({ total: NaN, ink: 'black' })
    const told = []
    nan.subscribe(guard.listen(() => told.push('told')))
    nan.setState({ total: NaN })
    return { log: told }
  }
  // A listener that keeps a count in step with the lines: once it matches, its own change is no change.
  let calls = 0
  store.subscribe(
    guard.listen((state) => {
      calls += 1
      store.setState({ count: state.lines.length })
    })
  )
  store.setState((state) => ({ lines: [...state.lines, 'card'] }))
  return { calls, count: store.getState().count }
})

export const roundsCase = guarded((guard, kind) => {
  const store = ready(guard)
  const log = []
  const change = (n) => {
    log.push(`| change ${n}:`)
    store.setState({ jobs: 10 + n })
  }
  if (kind === 'twice' || kind === 'stopTwice') {
    const header = guard.listen(() => log.push('header'))
    const stopA = store.subscribe(header)
    const stopB = store.subscribe(header)
    change(1)
    if (kind === 'twice') return { log }
    stopA()
    change(2)
    stopA()
    change(3)
    stopB()
    change(4)
    return { log }
  }
  if (kind === 'self') {
    const stop = store.subscribe(
      guard.listen(() => {
        log.push('paper')
        stop()
      })
    )
    store.subscribe(guard.listen(() => log.push('header')))
    store.subscribe(guard.listen(() => log.push('total')))
    change(1)
    change(2)
    return { log }
  }
  if (kind === 'later') {
    let stopTotal
    store.subscribe(
      guard.listen(() => {
        log.push('header')
        stopTotal?.()
      })
    )
    store.subscribe(guard.listen(() => log.push('basket')))
    stopTotal = store.subscribe(guard.listen(() => log.push('total')))
    change(1)
    change(2)
    return { log }
  }
  if (kind === 'earlier') {
    const stopHeader = store.subscribe(guard.listen(() => log.push('header')))
    store.subscribe(
      guard.listen(() => {
        log.push('basket')
        stopHeader()
      })
    )
    store.subscribe(guard.listen(() => log.push('total')))
    change(1)
    change(2)
    return { log }
  }
  // A listener that starts another one the first time it is told.
  let started = false
  store.subscribe(
    guard.listen(() => {
      log.push('header')
      if (started) return
      started = true
      store.subscribe(guard.listen(() => log.push('note')))
    })
  )
  store.subscribe(guard.listen(() => log.push('total')))
  change(1)
  change(2)
  return { log }
})
