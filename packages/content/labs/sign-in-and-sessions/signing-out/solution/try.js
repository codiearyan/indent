// Run with: node try.js
// Starts the API with a clock you can move, signs Kofi in twice, and asks GET /me along the way:
// after signing out, and after the clock moves on by eight hours. Prints what came back.
import { createApp } from './src/app.js'

const kofi = { email: 'kofi@kilnworth.example', password: 'centre-the-clay' }
let time = Date.now()

let app
try {
  app = createApp({ now: () => time })
} catch (err) {
  console.log(`createApp() threw: ${err.message}`)
  process.exit(1)
}

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`
  async function send(label, method, path, { cookie, json } = {}) {
    const init = { method, headers: {} }
    if (cookie) init.headers.cookie = cookie
    if (json !== undefined) {
      init.headers['content-type'] = 'application/json'
      init.body = JSON.stringify(json)
    }
    try {
      const res = await fetch(base + path, init)
      console.log(
        `${label}: ${method} ${path}\n  -> ${res.status} ${(await res.text()).slice(0, 160)}`
      )
      for (const line of res.headers.getSetCookie()) console.log(`  set-cookie: ${line}`)
      console.log()
      return res
    } catch (err) {
      console.log(`${label}: ${method} ${path} -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  // fetch keeps no cookies, so each session cookie is sent back by hand.
  const signIn = async () =>
    (await send('Sign in', 'POST', '/sign-in', { json: kofi }))?.headers
      .getSetCookie()[0]
      ?.split(';')[0]

  const first = await signIn()
  await send('Signed in', 'GET', '/me', { cookie: first })
  await send('Sign out', 'POST', '/sign-out', { cookie: first })
  await send('The old cookie after signing out', 'GET', '/me', { cookie: first })

  const second = await signIn()
  time += 7 * 60 * 60 * 1000
  await send('Seven hours later', 'GET', '/me', { cookie: second })
  time += 60 * 60 * 1000
  await send('Eight hours later', 'GET', '/me', { cookie: second })

  server.closeAllConnections()
  server.close()
})
