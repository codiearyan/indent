// Idris's price list, with one place for every failure. Run: node src/price-list.js
// Each quote is a chain, and a failure anywhere in it skips ahead to the one catch().
import { sheetsInStock, firstFreeDay } from './store.js'

const tonight = { card: 500, poster: 100, napkin: 50 }

for (const [item, wanted] of Object.entries(tonight)) {
  sheetsInStock(item)
    .then((sheets) => {
      if (sheets < wanted) throw new Error(`only ${sheets} ${item} sheets, ${wanted} needed`)
      return firstFreeDay()
    })
    .then((day) => `${item}: ${wanted} can go on the press on ${day}`)
    .catch((error) => `${item}: no quote tonight, ${error.message}`)
    .then((line) => console.log(line))
}

console.log('the rest of the script carries on')
