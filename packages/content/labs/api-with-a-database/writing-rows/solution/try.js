// Run with: node try.js
// Starts the API on data/kilnworth.db, adds a workshop, restarts as a server would, reads it back,
// changes it and removes it again, so the file ends as it began.
import { createApp } from './src/app.js'

const staff = { 'x-staff-key': process.env.STAFF_KEY ?? 'kilnworth-staff' }
const bowls = { title: 'Throwing bowls', day: 'fri', seats: 6, priceCents: 4400 }

async function run(steps) {
  let app
  try {
    app = createApp()
  } catch (err) {
    console.log(`createApp() threw: ${err.message}`)
    process.exit(1)
  }
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  const answers = []
  for (const step of steps) {
    const { method = 'GET', json } = step
    const path = typeof step.path === 'function' ? step.path(answers) : step.path
    const init = { method, headers: { ...staff } }
    if (json !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      const text = await res.text()
      console.log(`${method} ${path} -> ${res.status}`)
      if (text) console.log(`  ${text.slice(0, 200)}`)
      answers.push(text ? JSON.parse(text) : null)
    } catch (err) {
      console.log(`${method} ${path} -> failed: ${err.cause?.message ?? err.message}`)
      answers.push(null)
    }
  }
  server.closeAllConnections()
  server.close()
  return answers
}

const [made] = await run([{ method: 'POST', path: '/workshops', json: bowls }])
const at = `/workshops/${made?.id}`
console.log('\n(the server restarts)\n')
await run([
  { path: at },
  { method: 'PATCH', path: at, json: { seats: 8 } },
  { method: 'DELETE', path: at },
  { method: 'DELETE', path: at }
])
