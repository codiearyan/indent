// The check's own store for useStore, put in place of src/order-store.js. It counts the
// subscriptions that are still listening, so the check can see a component stop listening.
import { createStore } from './store.js'

export const orderStore = createStore({ jobs: 2, ink: 'black', stock: 'linen', lines: ['menu', 'tag'] })

let active = 0
const subscribe = orderStore.subscribe
orderStore.subscribe = (listener) => {
  active += 1
  const stop = subscribe(listener)
  let stopped = false
  return () => {
    if (!stopped) active -= 1
    stopped = true
    stop()
  }
}

export const listening = () => active
