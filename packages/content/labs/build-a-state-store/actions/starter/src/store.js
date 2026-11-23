// Ashgrove's own store. Nothing but plain JavaScript.
//
// Task 1: Keep actions beside the state (createStore)
// Tasks 2 and 3 are in order-actions.js.

// nextState(state, part) returns the state with the part joined in: every key of the part takes
// its new value, and every other key keeps the one it had. It never changes state or part.
export function nextState(state, part) {
  return { ...state, ...part }
}

// createStore(initial, makeActions) returns a new store whose state starts as `initial`.
// store.getState() returns the state now.
// store.setState(change) joins a part into the state; `change` is the part, or a function that
// is called with the state now and returns the part. A part that is not an object is refused.
// A part whose every key already has that very value changes nothing: nobody is told.
// store.subscribe(listener) adds a listener and returns a function that stops it. After every
// change, each listener is called with (state, previous). A round tells everyone who was
// listening when it began, once each, in the order they subscribed.
//
// Task 1: makeActions, when given, is called once with the store itself, and what it returns is
// kept as store.actions. Without it, store.actions is an empty object. A makeActions that is not
// a function throws a TypeError.
export function createStore(initial, makeActions) {
  if (!isObject(initial)) throw new TypeError('The first state of a store is an object.')
  let state = initial
  let listeners = []

  const store = {
    getState: () => state,

    setState(change) {
      const part = typeof change === 'function' ? change(state) : change
      if (!isObject(part)) throw new TypeError('setState takes an object, or a function that returns one.')
      const same = Object.keys(part).every((key) => Object.hasOwn(state, key) && Object.is(state[key], part[key]))
      if (same) return
      const previous = state
      state = nextState(state, part)
      for (const entry of listeners) entry.listener(state, previous)
    },

    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('A listener is a function.')
      const entry = { listener }
      listeners = [...listeners, entry]
      return () => {
        listeners = listeners.filter((other) => other !== entry)
      }
    },

    actions: {}
  }

  if (makeActions !== undefined) throw new Error('Not implemented')
  return store
}

function isObject(value) {
  return typeof value === 'object' && value !== null
}

// watch(store, selector, listener, isEqual) tells `listener` only when the part `selector` picks
// out of the state has changed: listener(part, previousPart). It returns a function that stops it.
// Parts are compared with Object.is, or with isEqual(previousPart, part) when it is given.
export function watch(store, selector, listener, isEqual = Object.is) {
  let current = selector(store.getState())
  return store.subscribe((state) => {
    const next = selector(state)
    if (isEqual(current, next)) return
    const previous = current
    current = next
    listener(next, previous)
  })
}

// shallowEqual(a, b) is true when a and b are the same value, or two objects with the same keys
// whose values are the same, each compared with Object.is.
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (!isObject(a) || !isObject(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => Object.hasOwn(b, key) && Object.is(a[key], b[key]))
}
