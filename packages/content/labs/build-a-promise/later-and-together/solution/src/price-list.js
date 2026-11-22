// Tonight's price list. Run: node src/price-list.js
// Look at the order of the lines: the second count comes from memory, already settled.
import { Docket } from './docket.js'
import { sheetsInStock, firstFreeDay, giveUpAfter } from './store.js'

function count(item) {
  console.log(`asking for ${item}`)
  sheetsInStock(item).then((sheets) => console.log(`  ${item}: ${sheets} sheets`))
  console.log(`asked for ${item}, carrying on`)
}

console.log('first count, from the file')
count('card')

setTimeout(() => {
  console.log('second count, from memory')
  count('invite')

  Docket.all(['card', 'invite', 'poster'].map(sheetsInStock)).then((counts) =>
    console.log(`every paper at once: ${counts.join(', ')}`)
  )
  Docket.race([firstFreeDay(), giveUpAfter(500, 'The press queue')]).then(
    (day) => console.log(`first free day: ${day}`),
    (error) => console.log(`no day tonight: ${error.message}`)
  )
}, 100)
