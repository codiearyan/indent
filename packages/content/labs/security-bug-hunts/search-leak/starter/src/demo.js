// Run with: node src/demo.js
import { openDb } from './db.js'
import { searchOrders } from './search.js'
import { reproduceSearchLeak } from './reproduce.js'

const db = openDb()
const searches = [
  [101, 'cards'],
  [102, ''],
  [103, "Mother's Day"]
]
for (const [customerId, text] of searches) {
  try {
    console.log(`customer ${customerId} searches ${JSON.stringify(text)}:`, searchOrders(db, customerId, text))
  } catch (err) {
    console.log(`customer ${customerId} searches ${JSON.stringify(text)}: Error: ${err.message}`)
  }
}

console.log('\nreproduceSearchLeak():')
try {
  console.log(reproduceSearchLeak())
} catch (err) {
  console.log(`Error: ${err.message}`)
}
