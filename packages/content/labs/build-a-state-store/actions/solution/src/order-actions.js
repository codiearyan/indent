// The order screen's changes, each with a name. createStore() hands this function the store, so
// an action can read the state, change it, and call another action through store.actions.
//
// Task 2: Name the basket's changes (add, remove, reorder)
// Task 3: An action that waits (loadPrices)
import { fetchPrices } from './price-list.js'

export function orderActions(store) {
  return {
    // Task 2
    // add(item, quantity) puts a line at the end of the basket, or adds the quantity to the line
    // for that item when there is one.
    add(item, quantity) {
      store.setState((state) => {
        const found = state.basket.some((line) => line.item === item)
        return {
          basket: found
            ? state.basket.map((line) => (line.item === item ? { ...line, quantity: line.quantity + quantity } : line))
            : [...state.basket, { item, quantity }]
        }
      })
    },

    // Task 2
    // remove(item) takes the item's line out of the basket. An item that is not there changes nothing.
    remove(item) {
      if (!store.getState().basket.some((line) => line.item === item)) return
      store.setState((state) => ({ basket: state.basket.filter((line) => line.item !== item) }))
    },

    // Task 2
    // reorder(lines) puts every line of an earlier order into the basket, each one with add.
    reorder(lines) {
      for (const line of lines) store.actions.add(line.item, line.quantity)
    },

    // Task 3
    // loadPrices() asks the price list for the prices. At once: loading is true and error is null.
    // When the prices come: prices holds them and loading is false. When it fails: loading is
    // false and error is the failure's message. It returns a promise that settles once the state
    // is set, and never rejects.
    async loadPrices() {
      store.setState({ loading: true, error: null })
      try {
        const prices = await fetchPrices()
        store.setState({ prices, loading: false })
      } catch (error) {
        store.setState({ loading: false, error: error.message })
      }
    }
  }
}
