// Ashgrove's own store. Nothing but plain JavaScript.
//
// Task 1: Keep the state in one place (createStore, getState, setState, nextState)
// Task 2: Change it with a function (setState)
// Task 3: Never change the old state (nextState, setState)

// Tasks 1 and 3
// nextState(state, part) returns the state with the part joined in: every key of the part takes
// its new value, and every other key keeps the one it had. It never changes state or part.
export function nextState(state, part) {
  throw new Error('Not implemented')
}

// Tasks 1, 2 and 3
// createStore(initial) returns a new store whose state starts as `initial`.
// store.getState() returns the state now.
// store.setState(part) joins a part into the state, using nextState.
// Task 2: setState(fn) calls fn with the state now and joins in the part fn returns. A first
// state, a part or a returned part that is not an object throws a TypeError.
export function createStore(initial) {
  throw new Error('Not implemented')
}
