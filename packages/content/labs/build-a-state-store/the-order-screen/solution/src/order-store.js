// The one store of the order screen. Every part of the screen reads from it and changes it
// through its actions.
import { orderActions } from './order-actions.js'
import { OPEN_ORDER } from './order.js'
import { createStore } from './store.js'

export const orderStore = createStore(OPEN_ORDER, orderActions)
