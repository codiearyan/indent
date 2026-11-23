// Puts three parts of the order screen on your store, each one listening, then makes a few
// changes and prints every time a part is told. Run with: node src/try.js
import { OPEN_ORDER, pounds, totalOf } from './order.js'
import { createStore } from './store.js'

const store = createStore(OPEN_ORDER)

store.subscribe((state) => console.log(`  header told: Basket (${state.basket.length})`))
const stopTotal = store.subscribe((state, previous) =>
  console.log(`  total told: ${pounds(totalOf(previous.basket))} -> ${pounds(totalOf(state.basket))}`)
)
// The paper picker only needs to hear about one change, then it is closed.
const stopPaper = store.subscribe((state) => {
  console.log(`  paper picker told: ${state.paper}, and it closes`)
  stopPaper()
})
store.subscribe((state) => console.log(`  note box told: "${state.note}"`))

console.log('Add 40 posters:')
store.setState((state) => ({ basket: [...state.basket, { item: 'poster', quantity: 40 }] }))

console.log('Choose linen paper again and again:')
store.setState({ paper: 'linen' })
store.setState({ paper: 'linen' })

console.log('The total stops listening, then the note changes:')
stopTotal()
store.setState({ note: 'Deliver by Friday' })
