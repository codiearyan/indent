// Starts your server, sends it the requests in requests.txt, shows each answer, then stops the
// server, so nothing is left running. Each line of requests.txt is one request: the method, the
// address, and for a POST, the body after them. Lines that start with # are skipped.
// Before the server's name you can put settings, NAME=value, as with try.js, and --busy, which
// takes the port first so your server finds it in use. For example:
//   node ask.js server.js
//   node ask.js server.js other-requests.txt
//   node ask.js PORT=abc server.js
//   node ask.js --busy server.js
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import net from 'node:net'

const words = process.argv.slice(2)
const settings = {}
let busy = false
while (words.length > 0) {
  const setting = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(words[0])
  if (setting) settings[setting[1]] = setting[2]
  else if (words[0] === '--busy') busy = true
  else break
  words.shift()
}
const [script, file = 'requests.txt'] = words

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const show = (text, pad = '  ') =>
  text === '' ? `${pad}(nothing)` : text.replace(/\n$/, '').split('\n').map((l) => `${pad}${l}`).join('\n')

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

function connects(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

function send(host, port, method, path, body) {
  return new Promise((resolve) => {
    const headers = body === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    const req = http.request({ host, port, method, path, headers, agent: false })
    const timer = setTimeout(() => {
      req.destroy()
      resolve(`    no answer within 3 seconds`)
    }, 3000)
    req.on('error', (error) => {
      clearTimeout(timer)
      resolve(`    no answer: the connection was closed (${error.code ?? error.message})`)
    })
    req.on('response', (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (d) => (text += d))
      res.on('end', () => {
        clearTimeout(timer)
        const lines = [`    status: ${res.statusCode}`, `    content-type: ${res.headers['content-type'] ?? '(none)'}`]
        if (res.headers.allow !== undefined) lines.push(`    allow: ${res.headers.allow}`)
        resolve([...lines, '    body:', show(text, '      ')].join('\n'))
      })
    })
    ;(async () => {
      if (body !== undefined) {
        // A body sent in three pieces, as a phone on a slow line would.
        const size = Math.ceil(body.length / 3)
        for (let i = 0; i < body.length; i += size) {
          req.write(body.slice(i, i + size))
          await wait(50)
        }
      }
      req.end()
    })()
  })
}

if (script === undefined) {
  console.error('Name the server to try, for example: node ask.js server.js')
  process.exitCode = 1
} else {
  const port = settings.PORT ?? String(await freePort())
  let holder
  if (busy) {
    holder = net.createServer()
    await new Promise((resolve) => holder.listen(Number(port), resolve))
  }
  const server = spawn(process.execPath, [script], {
    env: { ...process.env, ...settings, PORT: port },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let stdout = ''
  let stderr = ''
  let code
  server.stdout.on('data', (d) => (stdout += d))
  server.stderr.on('data', (d) => (stderr += d))
  const ended = new Promise((resolve) => server.on('close', (c) => resolve((code = c))))
  let stopped = false
  const stop = () => {
    if (code !== undefined) return
    stopped = true
    server.kill()
    // A server that catches the polite signal is ended for sure after 3 seconds.
    setTimeout(() => server.kill('SIGKILL'), 3000).unref()
  }
  process.on('SIGINT', stop)

  // A PORT that is not a port cannot be listened on: then wait to see what the server does with it.
  const probe = /^\d+$/.test(port) && Number(port) > 0 && Number(port) < 65536 && !busy
  let host
  for (let tries = 0; tries < 50 && code === undefined && probe && host === undefined; tries++) {
    for (const h of ['127.0.0.1', '::1']) if (host === undefined && (await connects(h, port))) host = h
    if (host === undefined) await wait(100)
  }
  if (!probe) await Promise.race([ended, wait(5000)])

  console.log(busy ? `ask.js took port ${port} first, then started ${script} with PORT=${port}.` : `Started ${script} with PORT=${port}.`)
  if (host !== undefined) {
    const text = await readFile(file, 'utf8').catch(() => null)
    if (text === null) console.log(`There is no ${file} to read the requests from.`)
    const requests = (text ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'))
    for (const line of requests) {
      const [, method, path, body] = /^(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(line) ?? []
      console.log(line.length > 80 ? `${line.slice(0, 77)}...` : line)
      if (!path?.startsWith('/')) console.log('    not sent: write the method, then the address, which starts with /')
      else console.log(await send(host, port, method.toUpperCase(), path, body))
    }
  } else if (code === undefined) {
    console.log(`It was not listening on port ${port} after 5 seconds, so no request was sent.`)
  }
  stop()
  await ended
  holder?.close()
  console.log(`What ${script} printed:`)
  console.log('standard output:')
  console.log(show(stdout))
  console.log('standard error:')
  console.log(show(stderr))
  console.log(stopped ? 'stopped by ask.js' : `exit code: ${code}`)
}
