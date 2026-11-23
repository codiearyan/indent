// Copied into the sandbox as .grader/drive.mjs. Task 1 drives the learner's createStore with
// actions of its own. Tasks 2 and 3 run the learner's orderActions on the check's own store
// (put in place of src/store.js) and price list, so they do not depend on task 1. Every case runs
// in its own process with a fresh store.
import * as lib from '../src/store.js'
import { attempt, guarded, wait, within } from './helpers.mjs'

const BASKET = [
  { item: 'menu', quantity: 60 },
  { item: 'tag', quantity: 500 }
]
const order = () => ({ basket: BASKET.map((line) => ({ ...line })), paper: 'kraft', note: '', prices: null, loading: false, error: null })

export const actionsCase = guarded((guard, kind) => {
  if (kind === 'none') {
    const store = lib.createStore({ jobs: 1 })
    return { actions: store.actions, isObject: typeof store.actions === 'object' && store.actions !== null }
  }
  if (kind === 'bad') return { bad: attempt(() => lib.createStore({ jobs: 1 }, 'add')) }
  let calls = 0
  let given
  const store = lib.createStore({ jobs: 1 }, (s) => {
    calls += 1
    given = s
    return {
      more: (n) => {
        s.setState((state) => ({ jobs: state.jobs + n }))
        return `now ${s.getState().jobs}`
      },
      twice: () => {
        s.actions.more(1)
        s.actions.more(1)
      }
    }
  })
  if (kind === 'kept') {
    const told = []
    store.subscribe(guard.listen((state) => told.push(state.jobs)))
    const returned = typeof store.actions?.more === 'function' ? store.actions.more(4) : undefined
    return { has: typeof store.actions?.more, returned, jobs: store.getState().jobs, told }
  }
  if (kind === 'once') return { calls, same: given === store }
  store.actions.twice()
  return { jobs: store.getState().jobs }
})

async function withOrder() {
  const { orderActions } = await import('../src/order-actions.js')
  return lib.createStore(order(), orderActions)
}
const lines = (store) => store.getState().basket.map((line) => `${line.quantity} ${line.item}`)

export const basketCase = guarded(async (guard, kind) => {
  const store = await withOrder()
  const before = store.getState().basket
  let told = 0
  store.subscribe(guard.listen(() => (told += 1)))
  const { add, remove, reorder } = store.actions
  if (kind === 'new') add('poster', 40)
  if (kind === 'join') add('menu', 15)
  if (kind === 'remove') remove('menu')
  if (kind === 'absent') remove('napkin')
  if (kind === 'reorder') {
    reorder([
      { item: 'tag', quantity: 250 },
      { item: 'poster', quantity: 20 },
      { item: 'menu', quantity: 5 }
    ])
  }
  return {
    lines: lines(store),
    told,
    oldKept: JSON.stringify(before) === JSON.stringify(BASKET),
    newArray: store.getState().basket !== before
  }
})

export const pricesCase = guarded(async (guard, kind) => {
  globalThis.priceList = { calls: 0 }
  const list = globalThis.priceList
  const store = await withOrder()
  const states = []
  store.subscribe(guard.listen((state) => states.push({ loading: state.loading, error: state.error, prices: state.prices })))
  if (kind === 'clears') store.setState({ error: 'The price list was closed.' })
  const earlierPrices = { menu: 40, tag: 4 }
  if (kind === 'fails') store.setState({ prices: earlierPrices })
  states.length = 0
  let settled = false
  let rejected
  const returned = store.actions.loadPrices()
  const isPromise = typeof returned?.then === 'function'
  if (isPromise) returned.then(() => (settled = true), (error) => (rejected = String(error?.message ?? error)))
  const atOnce = { ...store.getState(), basket: undefined }
  await wait(20)
  const settledEarly = settled
  if (kind === 'meanwhile') store.setState({ note: 'Rush job' })
  const prices = { menu: 45, tag: 4 }
  if (kind === 'fails') list.reject?.(new Error('The price list is shut for the night.'))
  else list.resolve?.(prices)
  const outcome = isPromise ? await within(1000, returned) : {}
  await wait(20)
  const end = store.getState()
  return {
    calls: list.calls,
    isPromise,
    atOnce: { loading: atOnce.loading, error: atOnce.error },
    toldAtOnce: states.length > 0,
    settledEarly,
    hung: Boolean(outcome.hung),
    rejected: rejected ?? outcome.threw,
    end: { loading: end.loading, error: end.error, prices: end.prices, note: end.note },
    pricesSame: end.prices === prices,
    pricesKept: end.prices === earlierPrices
  }
})
