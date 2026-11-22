// Run with: node try.js
// Starts the API on a copy of the studio's data in memory, so every run starts the same. It fills
// glazing basics (6 places) one booking at a time, tries one more, then books two groups on the
// Thursday wheel class (6 places): one that fits and one that is too big.
import { DatabaseSync } from 'node:sqlite'
import { createApp } from './src/app.js'
import { createTables, seedWorkshops } from './src/db.js'
import { workshops } from './src/workshops.js'

const db = new DatabaseSync(':memory:')
createTables(db)
seedWorkshops(db, workshops)

const requests = [
  ...['Bronagh Kell', 'Senna Okafor', 'Ama Boateng', 'Cai Rowe', 'Dov Lerner', 'Elif Arslan'].map(
    (name) => ({ path: '/bookings', json: { workshopId: 3, name } })
  ),
  { path: '/bookings', json: { workshopId: 3, name: 'Fen Odell' } },
  {
    path: '/bookings/group',
    json: { workshopId: 4, names: ['Gil Navon', 'Hana Seki', 'Ines Prado'] }
  },
  {
    path: '/bookings/group',
    json: { workshopId: 4, names: ['Jo Marr', 'Kit Lund', 'Lev Orr', 'Mo Tae'] }
  },
  { method: 'GET', path: '/workshops?day=thu' }
]

let app
try {
  app = createApp({ db })
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { method = 'POST', path, json } of requests) {
    const init = { method, headers: {} }
    if (json !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      console.log(`${method} ${path}${json ? ` ${JSON.stringify(json)}` : ''} -> ${res.status}`)
      console.log(`  ${(await res.text()).slice(0, 300)}\n`)
    } catch (err) {
      console.log(`${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
})
