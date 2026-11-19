// Run with: node try.js
// Starts the API on a free port, sends a few requests, prints what came back, then stops.
import { createApp } from './src/app.js'

const paths = [
  '/boats?limit=3',
  '/boats?limit=3&offset=3',
  '/boats?type=double&sort=-hourlyCents',
  '/boats?available=false',
  '/boats?limit=500&sort=price'
]

function summary(body) {
  if (!Array.isArray(body.data)) return JSON.stringify(body).slice(0, 300)
  const codes = body.data.map((boat) => `${boat.code} ${boat.name} ${boat.hourlyCents}`)
  return `total ${body.total}, limit ${body.limit}, offset ${body.offset}\n  ${codes.join('\n  ')}`
}

async function main() {
  const server = createApp()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  for (const path of paths) {
    try {
      const res = await fetch(base + path)
      const text = await res.text()
      let body
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
      console.log(`GET ${path}\n  -> ${res.status} ${summary(body)}\n`)
    } catch (err) {
      console.log(`GET ${path}\n  -> failed: ${err.cause?.message ?? err.message}\n`)
    }
  }
  server.closeAllConnections()
  server.close()
}

main()
