// Idris's nightly price list, cut down to the part that waits. Run: node src/price-list.js
// Now the script says what to do when each count arrives, instead of looking again later.
import { Docket } from './docket.js'
import { sheetsInStock } from './store.js'

const said = (error) => console.log(`  not this time: ${error.message}`)

console.log('asking the store room for card and napkins')
const card = sheetsInStock('card')
card.then((sheets) => console.log(`card: ${sheets} sheets`), said)
card.then((sheets) => console.log(`card: enough for ${Math.floor(sheets / 100)} jobs of 100`))
sheetsInStock('napkin').then((sheets) => console.log(`napkins: ${sheets} sheets`), said)

const counted = new Docket((resolve) => resolve(60))
counted.then((sheets) => console.log(`posters, counted by hand: ${sheets} sheets`))

console.log('the rest of the script carries on')
