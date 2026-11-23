// Copied into the sandbox as .grader/drive.mjs. Drives the learner's store with states of its own.
// Every case runs in its own process, so every case makes a fresh store.
import * as lib from '../src/store.js'
import { attempt, earlier, needs } from './helpers.mjs'

const copy = (value) => JSON.parse(JSON.stringify(value))
// The same keys and values, in any order.
const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]))
      : value
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))

// Later tasks first make sure a part is joined in, so they can say plainly when task 1 is not done.
function joined(initial, part) {
  const store = needs('This task needs createStore() from task 1, which does not work yet.', () =>
    lib.createStore(initial)
  )
  const want = { ...copy(initial), ...copy(part) }
  needs('This task needs setState() from task 1, which does not work yet.', () => store.setState(part))
  if (!same(store.getState(), want)) {
    earlier('This task needs task 1 first: setState() does not join a part into the state yet.')
  }
  return store
}

export function createCase(kind) {
  if (kind === 'first') {
    const initial = { ink: 'black', sheets: [{ size: 'A5', count: 300 }] }
    const store = lib.createStore(initial)
    return { state: store.getState() }
  }
  if (kind === 'join') {
    const store = lib.createStore({ ink: 'black', stock: 'linen', lines: ['menu'] })
    store.setState({ stock: 'kraft' })
    return { state: store.getState() }
  }
  if (kind === 'many') {
    const store = lib.createStore({ ink: 'black', stock: 'linen', rush: false })
    store.setState({ rush: true, proof: 'sent' })
    store.setState({ ink: 'blue' })
    return { state: store.getState() }
  }
  if (kind === 'whole') {
    const store = lib.createStore({ stock: { kind: 'linen', weight: 300 }, ink: 'black' })
    store.setState({ stock: { kind: 'kraft' } })
    return { state: store.getState() }
  }
  if (kind === 'two') {
    const a = lib.createStore({ jobs: 1 })
    const b = lib.createStore({ jobs: 5 })
    a.setState({ jobs: 2 })
    return { a: a.getState(), b: b.getState() }
  }
  return { result: lib.nextState({ ink: 'black', stock: 'linen', rush: false }, { stock: 'kraft', proof: 'sent' }) }
}

export function updaterCase(kind) {
  if (kind === 'first') {
    const result = attempt(() => lib.createStore(null))
    const number = attempt(() => lib.createStore(42))
    return { first: result, number }
  }
  const store = joined({ jobs: 4, ink: 'black' }, { ink: 'black' })
  if (kind === 'fn') {
    const seen = []
    store.setState((state) => {
      seen.push(copy(state))
      return { jobs: state.jobs + 1 }
    })
    return { seen, state: store.getState() }
  }
  if (kind === 'twice') {
    store.setState((state) => ({ jobs: state.jobs + 1 }))
    store.setState({ ink: 'red' })
    store.setState((state) => ({ jobs: state.jobs + 1 }))
    return { state: store.getState() }
  }
  if (kind === 'part') {
    store.setState(() => ({ ink: 'green' }))
    return { state: store.getState() }
  }
  if (kind === 'bad') {
    const tries = [null, 7, 'kraft'].map((part) => attempt(() => store.setState(part)))
    return { tries, state: store.getState() }
  }
  const tries = [() => undefined, () => 'kraft'].map((fn) => attempt(() => store.setState(fn)))
  return { tries, state: store.getState() }
}

export function freshCase(kind) {
  if (kind === 'next') {
    const state = { ink: 'black', stock: 'linen' }
    const part = { stock: 'kraft' }
    const result = attempt(() => lib.nextState(state, part))
    return {
      result: result.value,
      threw: result.threw ? result.error : undefined,
      state,
      part,
      newObject: result.value !== state && result.value !== part
    }
  }
  const initial = { ink: 'black', stock: 'linen', jobs: 1 }
  const store = joined(initial, {})
  const before = store.getState()
  const kept = copy(before)
  if (kind === 'new') {
    store.setState({ stock: 'kraft' })
    return { newObject: store.getState() !== before, state: store.getState() }
  }
  if (kind === 'before') {
    store.setState({ stock: 'kraft', proof: 'sent' })
    store.setState((state) => ({ jobs: state.jobs + 1 }))
    return { before, kept, unchanged: same(before, kept) }
  }
  store.setState({ ink: 'red' })
  store.setState({ jobs: 3, rush: true })
  return { initial, unchanged: same(initial, { ink: 'black', stock: 'linen', jobs: 1 }) }
}
