// useStore(selector, isEqual) gives a component one part of the order store, and draws it again
// when that part changes.
//
// Task 1: Write useStore (useStore)
// Task 2: Draw only when the part changed (useStore)
import { useSyncExternalStore } from 'react'
import { orderStore } from './order-store.js'

// Tasks 1 and 2
// useStore(selector) returns selector(state) for the order store's state now, and the component
// that calls it draws again after a change of that part. It is built on React's
// useSyncExternalStore.
// Task 2: useStore(selector, isEqual): when isEqual(previousPart, part) says the part is the same,
// the component is not drawn again, even when the selector made a new object.
export function useStore(selector, isEqual) {
  throw new Error('Not implemented')
}
