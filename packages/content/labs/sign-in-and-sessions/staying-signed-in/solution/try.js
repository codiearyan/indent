// Run with: node try.js
// Starts the API on a free port, signs Kofi in, then asks GET /me with no cookie, with the cookie
// the sign-in sent, and with a made-up token. Prints what came back, then stops.
import { createApp } from './src/app.js'

const kofi = { email: 'kofi@kilnworth.example', password: 'centre-the-clay' }

let app
try {
  app = createApp()
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  async function send(label, path, init = {}) {
    try {
      const res = await fetch(base + path, init)
      console.log(`${label}\n  -> ${res.status} ${(await res.text()).slice(0, 200)}`)
      for (const cookie of res.headers.getSetCookie()) console.log(`  set-cookie: ${cookie}`)
      console.log()
      return res
    } catch (err) {
      console.log(`${label} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }

  const signedIn = await send('POST /sign-in as Kofi', '/sign-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(kofi)
  })
  // fetch keeps no cookies, so the cookie is sent back by hand, the way a browser would.
  const cookie = signedIn?.headers.getSetCookie()[0]?.split(';')[0]
  await send('GET /me with no cookie', '/me')
  if (cookie) await send(`GET /me with ${cookie.slice(0, 20)}...`, '/me', { headers: { cookie } })
  await send('GET /me with a made-up token', '/me', { headers: { cookie: 'session=let-me-in' } })

  server.closeAllConnections()
  server.close()
})
