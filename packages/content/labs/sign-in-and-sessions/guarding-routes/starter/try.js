// Run with: node try.js
// Starts the API on a free port and signs Kofi (a teacher) and Dilys (the owner) in. Then sends a
// few requests with the old staff key, as Kofi and as Dilys, and prints what came back.
import { createApp } from './src/app.js'

const people = {
  Kofi: { email: 'kofi@kilnworth.example', password: 'centre-the-clay' },
  Dilys: { email: 'dilys@kilnworth.example', password: 'kiln-door-at-six' }
}

let app
try {
  app = createApp()
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  async function send(label, method, path, { cookie, json, headers = {} } = {}) {
    const init = { method, headers: { ...headers } }
    if (cookie) init.headers.cookie = cookie
    if (json !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      console.log(
        `${label}: ${method} ${path}\n  -> ${res.status} ${(await res.text()).slice(0, 160)}\n`
      )
      return res
    } catch (err) {
      console.log(`${label}: ${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }

  // fetch keeps no cookies, so each session cookie is sent back by hand.
  const cookies = {}
  for (const [name, json] of Object.entries(people)) {
    const res = await send(`Sign in ${name}`, 'POST', '/sign-in', { json })
    cookies[name] = res?.headers.getSetCookie()[0]?.split(';')[0]
  }

  const key = { 'x-staff-key': process.env.STAFF_KEY ?? 'kilnworth-staff' }
  await send('Anyone', 'GET', '/workshops/3')
  await send('The old staff key', 'PATCH', '/workshops/5', { json: { seats: 14 }, headers: key })
  await send('Kofi', 'PATCH', '/workshops/5', { json: { seats: 14 }, cookie: cookies.Kofi })
  await send('Kofi', 'DELETE', '/workshops/3', { cookie: cookies.Kofi })
  await send('Dilys', 'DELETE', '/workshops/3', { cookie: cookies.Dilys })
  await send('Kofi', 'GET', '/staff', { cookie: cookies.Kofi })
  await send('Dilys', 'GET', '/staff', { cookie: cookies.Dilys })

  server.closeAllConnections()
  server.close()
})
