// Run with: node try.js
// Opens the studio's database file, prints what the workshops table holds, then closes it.
// Run it twice: the second time the file is already there, and nothing should be added twice.
import { openDatabase } from './src/db.js'

const file = 'data/kilnworth.db'

let db
try {
  db = openDatabase(file)
} catch (err) {
  console.log(`openDatabase() threw: ${err.message}`)
  process.exit(1)
}

try {
  const rows = db.prepare('SELECT * FROM workshops ORDER BY id').all()
  console.log(`${file} holds ${rows.length} workshops:`)
  for (const row of rows) console.log(`  ${row.id}  ${row.day}  ${row.title}`)
} catch (err) {
  console.log(`Reading the workshops table failed: ${err.message}`)
} finally {
  db.close()
}
