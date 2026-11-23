// The order screen's changes, each with a name. createStore() hands this function the store, so
// an action can read the state, change it, and call another action through store.actions.
import { fetchPrices } from './price-list.js'

export function orderActions(store) {
  return {
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

    remove(item) {
      if (!store.getState().basket.some((line) => line.item === item)) return
      store.setState((state) => ({ basket: state.basket.filter((line) => line.item !== item) }))
    },

    reorder(lines) {
      for (const line of lines) store.actions.add(line.item, line.quantity)
    },

    choosePaper(paper) {
      store.setState({ paper })
    },

    writeNote(note) {
      store.setState({ note })
    },

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
