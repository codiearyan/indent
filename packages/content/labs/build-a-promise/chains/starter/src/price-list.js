// Sefton's question, as a chain of dockets. Run: node src/price-list.js
// Each step waits for the one before: the paper count, then the press queue, then the answer.
import { sheetsInStock, firstFreeDay } from './store.js'

const wanted = 300

console.log(`can we print ${wanted} invitations, and when?`)
sheetsInStock('invite')
  .then((sheets) => {
    console.log(`  paper: ${sheets} invitation sheets in the store room`)
    return firstFreeDay()
  })
  .then((day) => {
    console.log(`  press: the first free day is ${day}`)
    return `${wanted} invitations can go on the press on ${day}`
  })
  .then((answer) => console.log(`  answer: ${answer}`))

console.log('the rest of the script carries on')
