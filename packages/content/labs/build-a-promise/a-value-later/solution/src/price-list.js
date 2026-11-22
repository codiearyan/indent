// Idris's nightly price list, cut down to the part that waits. Run: node src/price-list.js
// A docket has no way yet to say when it is ready, so this script looks again after a timer.
import { Docket } from './docket.js'
import { sheetsInStock } from './store.js'

console.log('asking the store room for card and napkins')
const card = sheetsInStock('card')
const napkins = sheetsInStock('napkin')
console.log(`card right away: ${card.state}`)

const counted = new Docket((resolve) => {
  resolve(60)
  resolve(9999)
})
console.log(`posters counted by hand: ${counted.state}, ${counted.value}`)

const smudged = new Docket(() => {
  throw new Error('Ink on the count sheet')
})
console.log(`a smudged count: ${smudged.state}, ${smudged.value?.message}`)

setTimeout(() => {
  console.log(`card a moment later: ${card.state}, ${card.value}`)
  console.log(`napkins a moment later: ${napkins.state}, ${napkins.value?.message}`)
}, 100)

console.log('the rest of the script carries on')
