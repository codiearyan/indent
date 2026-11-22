// Run with: node try.js
// Starts the API on data/kilnworth.db, books two places on the family morning and one on a
// workshop that does not exist, and shows the places left.
import { createApp } from './src/app.js'

const requests = [
  { method: 'POST', path: '/bookings', json: { workshopId: 5, name: 'Bronagh Kell' } },
  { method: 'POST', path: '/bookings', json: { workshopId: 5, name: 'Senna Okafor' } },
  { method: 'POST', path: '/bookings', json: { workshopId: 50, name: 'Bronagh Kell' } },
  { path: '/workshops/5' },
  { path: '/workshops?day=thu' }
]

let app
try {
  app = createApp()
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { method = 'GET', path, json } of requests) {
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
