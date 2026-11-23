// Puts the parts of the order screen on your store, each watching only what it shows, then
// makes a few changes and prints every part that is drawn again. Run with: node src/try.js
import { OPEN_ORDER, pounds, totalOf } from './order.js'
import { createStore, shallowEqual, watch } from './store.js'

const store = createStore(OPEN_ORDER)

watch(store, (state) => state.basket.length, (count) => console.log(`  header drawn: Basket (${count})`))
watch(store, (state) => totalOf(state.basket), (pence) => console.log(`  total drawn: ${pounds(pence)}`))
watch(store, (state) => state.paper, (paper) => console.log(`  paper picker drawn: ${paper}`))
// The summary line shows two things at once, so its selector makes a new object every time.
watch(
  store,
  (state) => ({ lines: state.basket.length, paper: state.paper }),
  (summary) => console.log(`  summary drawn: ${summary.lines} lines on ${summary.paper}`),
  shallowEqual
)

console.log('Choose linen paper:')
store.setState({ paper: 'linen' })

console.log('Type a note:')
store.setState({ note: 'Deliver by Friday' })

console.log('Change the invites from 120 to 150:')
store.setState((state) => ({
  basket: state.basket.map((line) => (line.item === 'invite' ? { ...line, quantity: 150 } : line))
}))

console.log('Add 40 posters:')
store.setState((state) => ({ basket: [...state.basket, { item: 'poster', quantity: 40 }] }))
