// Ashgrove's own store. Nothing but plain JavaScript.
//
// Task 1: Watch one part (watch)
// Task 2: Decide what counts as a change (watch)
// Task 3: Compare an object key by key (shallowEqual)

// nextState(state, part) returns the state with the part joined in: every key of the part takes
// its new value, and every other key keeps the one it had. It never changes state or part.
export function nextState(state, part) {
  return { ...state, ...part }
}

// createStore(initial) returns a new store whose state starts as `initial`.
// store.getState() returns the state now.
// store.setState(change) joins a part into the state; `change` is the part, or a function that
// is called with the state now and returns the part. A part that is not an object is refused.
// A part whose every key already has that very value changes nothing: nobody is told.
// store.subscribe(listener) adds a listener and returns a function that stops it. After every
// change, each listener is called with (state, previous). A round tells everyone who was
// listening when it began, once each, in the order they subscribed.
export function createStore(initial) {
  if (!isObject(initial)) throw new TypeError('The first state of a store is an object.')
  let state = initial
  let listeners = []

  return {
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
    }
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null
}

// Tasks 1 and 2
// watch(store, selector, listener, isEqual) tells `listener` only when the part `selector` picks
// out of the state has changed: listener(part, previousPart). It returns a function that stops it.
// Task 1: parts are compared with Object.is.
// Task 2: when isEqual is given, isEqual(previousPart, part) decides instead: true means the same.
export function watch(store, selector, listener, isEqual) {
  throw new Error('Not implemented')
}

// Task 3
// shallowEqual(a, b) is true when a and b are the same value, or two objects with the same keys
// whose values are the same, each compared with Object.is.
export function shallowEqual(a, b) {
  throw new Error('Not implemented')
}
