// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
import { createApp } from './src/app.js'

const kestrel = { code: 'TW-09', name: 'Kestrel', type: 'single', hourlyCents: 1900 }

const requests = [
  { method: 'GET', path: '/boats/TW-02' },
  { method: 'POST', path: '/boats', body: kestrel },
  { method: 'POST', path: '/boats', body: kestrel },
  { method: 'PATCH', path: '/boats/TW-09', body: { available: false } },
  { method: 'DELETE', path: '/boats/TW-09' },
  { method: 'GET', path: '/boats/TW-09' }
]

async function main() {
  let server
  try {
    server = createApp()
  } catch (err) {
    console.log(`createApp() failed:\n${err.stack.split('\n').slice(0, 2).join('\n')}`)
    return
  }
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  for (const { method, path, body } of requests) {
    const sent = body ? ` ${JSON.stringify(body)}` : ''
    try {
      const res = await fetch(base + path, {
        method,
        body: body && JSON.stringify(body),
        headers: body ? { 'content-type': 'application/json' } : {}
      })
      const location = res.headers.get('location')
      console.log(`${method} ${path}${sent}\n  -> ${res.status}${location ? ` location: ${location}` : ''}`)
      console.log(`  ${(await res.text()).slice(0, 200)}\n`)
    } catch (err) {
      console.log(`${method} ${path}${sent}\n  -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
}

main()
