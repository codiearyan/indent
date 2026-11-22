// Run with: node src/demo.js
import { openDb } from './db.js'
import { signIn } from './signIn.js'
import { reproduceLeak } from './reproduce.js'

const db = openDb()
const log = (line) => console.log(`  log: ${line}`)

console.log('Greta signs in:')
console.log('  result:', signIn(db, log, { email: 'greta@example.com', password: 'blue-heron-17' }))
console.log('Cosmo mistypes:')
console.log('  result:', signIn(db, log, { email: 'cosmo@example.com', password: 'tin-lantern-5' }))

console.log('\nreproduceLeak():')
try {
  console.log(reproduceLeak())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
