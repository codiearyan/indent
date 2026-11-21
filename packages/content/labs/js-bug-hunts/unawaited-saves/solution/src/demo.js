// Run with: node src/demo.js
// The evening sync, once with a healthy store and once with a store that fails on b102.
import { syncBookings } from './sync.js'
import { createFakeStore, evening } from './store.js'
import { reproduceEarlyReturn } from './reproduce.js'

process.on('unhandledRejection', (err) => {
  console.log(`  !! An error escaped syncBookings: ${err.message}`)
})

const store = createFakeStore()
const count = await syncBookings(evening, store)
console.log(`syncBookings resolved with ${count}, store has ${store.saved().length} saved`)

const broken = createFakeStore({ failOn: ['b102'] })
try {
  await syncBookings(evening, broken)
  console.log('With a failing save: syncBookings resolved as if all was well')
} catch (err) {
  console.log(`With a failing save: caught "${err.message}"`)
}

console.log('reproduceEarlyReturn():', await reproduceEarlyReturn().catch((err) => `Error: ${err.message}`))
