// Minimal CDP driver: node cdp.mjs shot <file> | eval <js> | nav <hash>
import { writeFileSync } from 'fs'
const [cmd, arg] = process.argv.slice(2)
setTimeout(() => process.exit(2), 25000).unref()
const port = process.env.CDP_PORT ?? 9222
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools'))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) pending.get(m.id)(m)
}
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return r.result.exceptionDetails
    ? { error: r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text }
    : r.result.result.value
}
if (cmd === 'shot') {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(arg, Buffer.from(r.result.data, 'base64'))
  console.log('saved', arg)
} else if (cmd === 'eval') {
  console.log(JSON.stringify(await evaluate(arg), null, 1))
} else if (cmd === 'nav') {
  await evaluate(`location.hash = ${JSON.stringify(arg)}`)
  await new Promise((r) => setTimeout(r, 1200))
  console.log(await evaluate('location.hash'))
}
if (cmd === 'navshot') {
  // Navigate and capture in one connection, so a click in the window cannot land in between.
  const [hash, file] = arg.split('|')
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await new Promise((r) => setTimeout(r, 1500))
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(file, Buffer.from(r.result.data, 'base64'))
  console.log('saved', file)
}
ws.close()
