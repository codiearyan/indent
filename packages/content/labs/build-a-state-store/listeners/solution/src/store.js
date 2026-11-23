// Ashgrove's own store. Nothing but plain JavaScript.
//
// Task 1: Tell every listener (subscribe, setState)
// Task 2: Stay quiet when nothing changed (setState)
// Task 3: Keep a round whole (subscribe, setState)

// nextState(state, part) returns the state with the part joined in: every key of the part takes
// its new value, and every other key keeps the one it had. It never changes state or part.
export function nextState(state, part) {
  return { ...state, ...part }
}

// createStore(initial) returns a new store whose state starts as `initial`.
// store.getState() returns the state now.
// store.setState(change) joins a part into the state; `change` is the part, or a function that
// is called with the state now and returns the part. A part that is not an object is refused.
//
// Task 1: store.subscribe(listener) adds a listener and returns a function that stops it. After
// every change, each listener is called with (state, previous), in the order they subscribed.
// Task 2: a part whose every key already has that very value changes nothing: the state stays
// the same object and nobody is told.
// Task 3: the same function subscribed twice listens twice, and each stop function stops only
// its own. A round tells everyone who was listening when it began, once each, even when a
// listener stops itself or another one during the round.
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
