// Puts the order screen on your store with its actions, loads the prices and changes the basket,
// printing what each part shows. Run with: node src/try.js
import { orderActions } from './order-actions.js'
import { OPEN_ORDER, pounds, totalOf } from './order.js'
import { createStore, watch } from './store.js'

const store = createStore(OPEN_ORDER, orderActions)
const { add, remove, reorder, loadPrices } = store.actions

watch(store, (state) => state.basket.length, (count) => console.log(`  header: Basket (${count})`))
watch(
  store,
  (state) => (state.loading ? 'Loading prices...' : state.error ?? (state.prices ? pounds(totalOf(state.basket, state.prices)) : 'no prices yet')),
  (total) => console.log(`  total: ${total}`)
)

console.log('Load the prices:')
const loaded = loadPrices()
console.log('Add 40 posters while the price list thinks:')
add('poster', 40)
await loaded

console.log('Order again what this customer ordered last month:')
reorder([
  { item: 'card', quantity: 100 },
  { item: 'invite', quantity: 30 }
])

console.log('Remove the cards, then napkins, which are not in the basket:')
remove('card')
remove('napkin')
console.log('Basket now:', store.getState().basket.map((line) => `${line.quantity} x ${line.item}`).join(', '))
