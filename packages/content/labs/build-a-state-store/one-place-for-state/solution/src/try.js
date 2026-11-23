// Makes the same changes on the old order screen and on a screen drawn from your store, and
// prints both. Run with: node src/try.js
import { oldScreen } from './old-screen.js'
import { OPEN_ORDER, pounds, totalOf } from './order.js'
import { createStore } from './store.js'

const old = oldScreen(OPEN_ORDER)
old.add('poster', 40)
old.remove('card')
old.remove('napkin')
console.log('The old screen, after adding posters and removing cards and napkins:')
console.log(old.draw())

const store = createStore(OPEN_ORDER)
store.setState({ basket: [...store.getState().basket, { item: 'poster', quantity: 40 }] })
store.setState((state) => ({ basket: state.basket.filter((line) => line.item !== 'card') }))
store.setState((state) => ({ basket: state.basket.filter((line) => line.item !== 'napkin') }))

// Every part of this screen is worked out from the one state, so the parts cannot disagree.
function draw(state) {
  return [
    `  Basket (${state.basket.length})`,
    ...state.basket.map((line) => `    ${line.quantity} x ${line.item}`),
    `  Paper: ${state.paper}`,
    `  Total: ${pounds(totalOf(state.basket))}`
  ].join('\n')
}

console.log('\nThe same changes on your store:')
console.log(draw(store.getState()))
console.log('\nThe open order it started from still has', OPEN_ORDER.basket.length, 'lines.')
