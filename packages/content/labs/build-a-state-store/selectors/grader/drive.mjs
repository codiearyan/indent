// Copied into the sandbox as .grader/drive.mjs. Drives the learner's watch() and shallowEqual()
// with states, selectors and listeners of its own. Every case runs in its own process with a
// fresh store, and every listener the check adds is counted.
import * as lib from '../src/store.js'
import { attempt, earlier, guarded, needs } from './helpers.mjs'

const START = { stock: 'linen', ink: 'black', lines: ['menu', 'tag'], jobs: 2, total: NaN }
const fresh = () => lib.createStore({ ...START, lines: [...START.lines] })

// Task 2 and the last case of task 3 first make sure watch() tells about a number part.
function ready(guard) {
  const store = fresh()
  const heard = []
  needs('This task needs watch() from task 1, which does not work yet.', () =>
    lib.watch(store, (state) => state.jobs, guard.listen((part) => heard.push(part)))
  )
  store.setState({ ink: 'blue' })
  store.setState({ jobs: 3 })
  if (heard.join() !== '3') {
    earlier('This task needs task 1 first: watch() does not tell a listener only when its own part changed yet.')
  }
  return fresh()
}

export const watchCase = guarded((guard, kind) => {
  const store = fresh()
  const calls = []
  const listener = guard.listen((part, previous) => calls.push([part, previous]))
  const selectors = {
    number: (state) => state.jobs,
    count: (state) => state.lines.length,
    text: (state) => state.lines.join(', '),
    array: (state) => state.lines,
    nan: (state) => state.total
  }
  const pick = kind === 'other' || kind === 'stop' || kind === 'previous' ? 'number' : kind
  const stop = lib.watch(store, selectors[pick], listener)
  if (kind === 'number') {
    store.setState({ jobs: 3 })
    return { calls }
  }
  if (kind === 'other') {
    store.setState({ ink: 'blue' })
    store.setState({ stock: 'kraft' })
    return { calls }
  }
  if (kind === 'previous') {
    store.setState({ jobs: 3 })
    store.setState({ ink: 'blue' })
    store.setState({ jobs: 5 })
    return { calls }
  }
  if (kind === 'count' || kind === 'text') {
    store.setState((state) => ({ lines: [...state.lines] }))
    store.setState((state) => ({ lines: [...state.lines, 'card'] }))
    return { calls }
  }
  if (kind === 'array') {
    store.setState((state) => ({ lines: [...state.lines] }))
    return { calls: calls.length, newArray: calls[0]?.[0] === store.getState().lines }
  }
  if (kind === 'nan') {
    // A second watcher on jobs tells NaN apart from a watch() that never compares at all.
    const control = []
    lib.watch(store, selectors.number, guard.listen((part) => control.push(part)))
    store.setState({ ink: 'blue' })
    return { calls, compares: control.length === 0 }
  }
  const returned = typeof stop
  if (returned === 'function') stop()
  store.setState({ jobs: 3 })
  return { returned, calls }
})

export const equalCase = guarded((guard, kind) => {
  const store = ready(guard)
  const calls = []
  const listener = guard.listen((part, previous) => calls.push([part, previous]))
  const both = (state) => ({ jobs: state.jobs, ink: state.ink })
  const sameBoth = (a, b) => a.jobs === b.jobs && a.ink === b.ink
  if (kind === 'decides') {
    lib.watch(store, both, listener, sameBoth)
    store.setState({ stock: 'kraft' })
    store.setState({ jobs: 4 })
    return { calls }
  }
  if (kind === 'default') {
    lib.watch(store, both, listener)
    store.setState({ stock: 'kraft' })
    return { calls: calls.length }
  }
  if (kind === 'args') {
    const seen = []
    lib.watch(store, both, listener, (a, b) => {
      seen.push([a, b])
      return sameBoth(a, b)
    })
    store.setState({ jobs: 5 })
    const last = calls[0]
    return { seen, calls: calls.length, newFirst: last?.[0]?.jobs === 5, oldSecond: last?.[1]?.jobs === 2 }
  }
  lib.watch(store, (state) => state.jobs, listener, () => false)
  store.setState({ ink: 'blue' })
  return { calls }
})

const PAIRS = {
  same: () => {
    const order = { count: 2, total: 1300 }
    return [order, order]
  },
  copy: () => [{ count: 2, total: 1300 }, { count: 2, total: 1300 }],
  value: () => [{ count: 2, total: 1300 }, { count: 2, total: 1450 }],
  extraB: () => [{ count: 2 }, { count: 2, total: 1300 }],
  extraA: () => [{ count: 2, total: 1300 }, { count: 2 }],
  nested: () => [{ lines: ['menu'] }, { lines: ['menu'] }],
  order: () => [{ count: 2, ink: 'black' }, { ink: 'black', count: 2 }],
  nan: () => [{ total: NaN }, { total: NaN }],
  missing: () => [{ count: 2, note: undefined }, { count: 2, rush: undefined }],
  numbers: () => [1300, 1300],
  texts: () => ['kraft', 'kraft'],
  kinds: () => [2, '2'],
  nullObject: () => [null, {}],
  arrays: () => [['menu', 'tag'], ['menu', 'tag']]
}

export function shallowCase(kinds) {
  return kinds.map((kind) => {
    const [a, b] = PAIRS[kind]()
    const r = attempt(() => lib.shallowEqual(a, b))
    return r.threw ? { kind, threw: r.error } : { kind, result: r.value }
  })
}

export const shallowWatchCase = guarded((guard) => {
  const store = ready(guard)
  const calls = []
  lib.watch(
    store,
    (state) => ({ count: state.lines.length, ink: state.ink }),
    guard.listen((part) => calls.push(part)),
    lib.shallowEqual
  )
  store.setState({ stock: 'kraft' })
  store.setState((state) => ({ lines: [...state.lines] }))
  store.setState({ ink: 'blue' })
  return { calls }
})
