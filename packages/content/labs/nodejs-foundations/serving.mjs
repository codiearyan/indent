// What the checks of part 3 share. A check starts the learner's server as `node server.js` with
// settings of its own, the way grading.mjs runs every script, sends it requests of its own and
// stops it. A small module loaded before the server (PRELOAD) makes it listen on 127.0.0.1 on a
// port the system picks, whatever port the code asks for, and reports on standard error what the
// code asked for, where it listens, each piece of a body it receives, when it closes and which
// programs it starts. So no check ever needs a fixed port, can collide with a server the learner
// left running, or asks the system's firewall for anything. Every run is stopped before the check
// ends: a server is killed once its requests are done, or once it failed to stop.
import { spawn } from 'node:child_process'
import http from 'node:http'
import { mkdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { clip } from '../../kit/sandbox.mjs'
import { broken, errorLine, guarded, guardFlags, hasStack, hide, MAX_READ, put, settingsEnv, unwritten } from './grading.mjs'

export const LISTEN_SECONDS = 5
export const ANSWER_SECONDS = 2
export const STOP_SECONDS = 3
// A whole run, however its requests go, is killed after this.
const RUN_SECONDS = 25

const MARK = '\u0000'

const PRELOAD = `import net from 'node:net'
import http from 'node:http'
import cp, { ChildProcess } from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { constants } from 'node:os'
import { dirname, join, basename } from 'node:path'

const o = JSON.parse(process.env.__CHECK_SERVE)
delete process.env.__CHECK_SERVE
const mark = (what, value) => process.stderr.write('\\u0000' + what + ' ' + JSON.stringify(value ?? null) + '\\n')

if (o.noNode) process.execPath = join(dirname(process.execPath), 'not-here', basename(process.execPath))

function ctrlC() {
  if (process.listenerCount('SIGINT') === 0) {
    mark('no-listener')
    process.exit(130)
  }
  mark('sigint')
  process.emit('SIGINT', 'SIGINT')
}

const validPort = (p) => {
  if (p === undefined || p === null) return true
  const n = typeof p === 'string' && p.trim() !== '' ? Number(p) : p
  return Number.isInteger(n) && n >= 0 && n <= 65535
}

let answered = 0
const listen = net.Server.prototype.listen
net.Server.prototype.listen = function (...args) {
  const first = typeof args[0] === 'function' ? undefined : args[0]
  const asked = first !== null && typeof first === 'object' ? first.port : first
  const done = typeof args.at(-1) === 'function' ? args.at(-1) : undefined
  mark('listen', { asked: asked === undefined || asked === null ? null : String(asked), kind: typeof asked })
  if (!validPort(asked)) {
    // Text such as 'abc' is a pipe name to Node, so the server may listen anyway: say where at once.
    this.once('listening', () => mark('listening', this.address()))
    return listen.apply(this, args)
  }
  if (o.busy) {
    const port = Number(asked)
    const error = new Error('listen EADDRINUSE: address already in use :::' + port)
    Object.assign(error, { code: 'EADDRINUSE', errno: -constants.errno.EADDRINUSE, syscall: 'listen', address: '::', port })
    process.nextTick(() => this.emit('error', error))
    return this
  }
  this.once('listening', () => mark('listening', this.address()))
  this.once('close', () => mark('closed'))
  if (this instanceof http.Server) {
    this.on('request', (req, res) =>
      res.once('finish', () => {
        answered++
        if (answered === o.stopAfter) setImmediate(ctrlC)
      })
    )
  }
  return listen.call(this, { port: 0, host: '127.0.0.1' }, done)
}

for (const name of ['setHeader', 'writeHead']) {
  const real = http.ServerResponse.prototype[name]
  http.ServerResponse.prototype[name] = function (...args) {
    if (this.headersSent) mark('late', name)
    return real.apply(this, args)
  }
}

const push = http.IncomingMessage.prototype.push
http.IncomingMessage.prototype.push = function (chunk, ...rest) {
  if (chunk !== null && chunk !== undefined && chunk.length > 0) mark('body', chunk.length)
  return push.call(this, chunk, ...rest)
}

const spawnIt = ChildProcess.prototype.spawn
ChildProcess.prototype.spawn = function (options) {
  mark('spawn', { file: options.file, args: (options.args ?? []).slice(1), shell: Boolean(options.shell) })
  const started = spawnIt.call(this, options)
  // Check's report waits for a line on its input before it prints the rest: one is sent once the
  // server has its first piece of output, so a server that answers on that piece always gets part.
  const { stdout, stdin } = this
  if (stdout && stdin) {
    stdin.on('error', () => {})
    const push = stdout.push
    stdout.push = function (chunk, ...rest) {
      if (chunk !== null && chunk !== undefined && chunk.length > 0) {
        stdout.push = push
        if (stdin.writable) stdin.write('\\n')
      }
      return push.call(this, chunk, ...rest)
    }
  }
  return started
}
for (const name of ['execSync', 'execFileSync', 'spawnSync']) {
  const real = cp[name]
  cp[name] = function (...args) {
    const options = args.find((a) => a !== null && typeof a === 'object' && !Array.isArray(a)) ?? {}
    const list = Array.isArray(args[1]) ? args[1].map(String) : []
    mark('spawn', { sync: name, file: String(args[0]), args: list, shell: name === 'execSync' || Boolean(options.shell) })
    return real.apply(this, args)
  }
}
syncBuiltinESMExports()
`

// The network is closed to a script under the permission model from Node 25 on, unless allowed.
const netFlags = () => (process.allowedNodeEnvironmentFlags.has('--allow-net') ? ['--allow-net'] : [])

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Splits the bytes of text into `count` pieces of about the same length, a letter's bytes too. */
export function pieces(text, count) {
  const bytes = Buffer.from(text)
  const size = Math.ceil(bytes.length / count)
  return Array.from({ length: count }, (_, i) => bytes.subarray(i * size, (i + 1) * size)).filter((p) => p.length > 0)
}

/**
 * Starts `node <script>` in `dir` with `env` and, once it listens, calls `talk(send)`.
 * send(method, path, { body, parts, chunked, type }) sends one request and resolves with what came
 * back: { request, answered, status, type, headers, body, json, hung, error, sent, of }. A body is
 * sent in `parts` pieces, each only once the server has received the one before, so a server that
 * reads only the first piece always sees part of the body; `chunked` sends it without its length.
 * Options: `env` (settings), `from`, `children` (allow starting programs), `busy` (the port is in
 * use), `stopAfter` (Ctrl+C after that many answers, then wait for the script to end), `noNode`
 * (process.execPath names a program that is not there).
 * Resolves with { code, stdout, stderr, asked, listening, closed, sigint, noListener, spawns,
 * replies, stillRunning, timedOut, flooded, command, from, guarded }.
 */
export async function serve(dir, script, { env = {}, from = '.', children = false, busy = false, stopAfter, noNode = false } = {}, talk = async () => {}) {
  const cwd = join(dir, ...from.split('/'))
  const file = relative(cwd, join(dir, ...script.split('/')))
  await mkdir(cwd, { recursive: true })
  await put(dir, '.check/serve.mjs', PRELOAD)
  const flags = (await guarded(dir)) ? [...guardFlags(dir), ...netFlags(), ...(children ? ['--allow-child-process'] : [])] : []
  const options = JSON.stringify({ busy, stopAfter: stopAfter ?? 0, noNode })
  const child = spawn(process.execPath, [...flags, '--import', pathToFileURL(join(dir, '.check', 'serve.mjs')).href, file], {
    cwd,
    env: { ...settingsEnv(env), __CHECK_SERVE: options },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const s = {
    stdout: '',
    stderr: '',
    asked: null,
    listening: null,
    closed: false,
    sigint: false,
    noListener: false,
    late: false,
    spawns: [],
    replies: [],
    stillRunning: false,
    timedOut: false,
    flooded: false,
    bodyPieces: 0
  }
  const waiters = new Set()
  const notify = () => {
    for (const w of waiters) w()
  }
  const take = (kept, chunk) => {
    if (kept.length + chunk.length > MAX_READ && !s.flooded) {
      s.flooded = true
      child.kill('SIGKILL')
    }
    return (kept + chunk).slice(0, MAX_READ)
  }
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (d) => (s.stdout = take(s.stdout, d)))
  let rest = ''
  child.stderr.on('data', (d) => {
    const parts = (rest + d).split('\n')
    rest = parts.pop()
    for (const line of parts) {
      if (!line.startsWith(MARK)) {
        s.stderr = take(s.stderr, line + '\n')
        continue
      }
      const space = line.indexOf(' ')
      const what = line.slice(1, space)
      const value = JSON.parse(line.slice(space + 1))
      if (what === 'listen') s.asked = value
      else if (what === 'listening') s.listening = value
      else if (what === 'closed') s.closed = true
      else if (what === 'sigint') s.sigint = true
      else if (what === 'no-listener') s.noListener = true
      else if (what === 'body') s.bodyPieces++
      else if (what === 'late') s.late = true
      else if (what === 'spawn') s.spawns.push(value)
    }
    notify()
  })
  let exited = false
  const ended = new Promise((resolve) => {
    child.on('close', (code) => {
      exited = true
      if (rest && !rest.startsWith(MARK)) s.stderr = take(s.stderr, rest)
      s.code = code
      notify()
      resolve()
    })
    child.on('error', () => {
      exited = true
      resolve()
    })
  })
  const cap = setTimeout(() => {
    s.timedOut = true
    child.kill('SIGKILL')
  }, RUN_SECONDS * 1000)

  /** Resolves once `ready()` is true, the script has ended, or `ms` have passed. */
  const until = (ready, ms) =>
    new Promise((resolve) => {
      if (ready() || exited) return resolve()
      const timer = setTimeout(done, ms)
      function done() {
        clearTimeout(timer)
        waiters.delete(check)
        resolve()
      }
      function check() {
        if (ready() || exited) done()
      }
      waiters.add(check)
    })

  try {
    await until(() => s.listening !== null, LISTEN_SECONDS * 1000)
    const where = s.listening
    if (where && typeof where === 'object' && !exited) {
      // What it prints once listening comes just after; give it a moment to arrive.
      await until(() => s.stdout.includes('\n'), 500)
      const send = (method, path, opts = {}) => ask(where.port, method, path, opts, s, until)
      await talk(send)
      if (stopAfter !== undefined && !exited) {
        await until(() => false, STOP_SECONDS * 1000)
        if (!exited) s.stillRunning = true
      }
    }
  } finally {
    if (!exited) child.kill('SIGKILL')
    await ended
    clearTimeout(cap)
  }
  s.stdout = clip(s.stdout)
  s.stderr = clip(s.stderr)
  const settings = Object.entries(env).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`)
  s.command = ['node', file].join(' ') + (settings.length ? `, with ${settings.join(' and ')}` : ', with no PORT')
  s.from = from
  s.guarded = flags.length > 0
  s.children = children
  return s
}

/** Sends one request to the server on `port` and says what came back. */
function ask(port, method, path, { body, parts = 1, chunked = false, type = 'application/json' }, s, until) {
  const request =
    body === undefined
      ? `${method} ${path}`
      : body.length <= 60 && body.trim() !== ''
        ? `${method} ${path} ${body}`
        : `${method} ${path} with a body of ${Buffer.byteLength(body)} bytes`
  const list = body === undefined ? [] : pieces(body, parts)
  const headers = body === undefined ? {} : { 'content-type': type }
  if (body !== undefined && !chunked) headers['content-length'] = Buffer.byteLength(body)
  return new Promise((resolve) => {
    let settled = false
    let sent = 0
    let timer
    const finish = (reply) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      req.destroy()
      const result = { request, path, method, sent, of: list.length, ...reply }
      s.replies.push(result)
      resolve(result)
    }
    const startTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => finish({ answered: false, hung: true }), ANSWER_SECONDS * 1000)
    }
    const req = http.request({ host: '127.0.0.1', port, method, path, headers, agent: false })
    req.on('error', (error) => finish({ answered: false, error: error.code ?? error.message }))
    req.on('response', (res) => {
      clearTimeout(timer)
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (d) => (text = (text + d).slice(0, MAX_READ)))
      res.on('end', () => {
        let json
        try {
          json = JSON.parse(text)
        } catch {}
        finish({ answered: true, status: res.statusCode, type: res.headers['content-type'], headers: res.headers, body: text, json })
      })
      res.on('error', () => finish({ answered: true, status: res.statusCode, type: res.headers['content-type'], headers: res.headers, body: text, cut: true }))
      timer = setTimeout(() => finish({ answered: false, hung: true, status: res.statusCode, started: true, body: text }), ANSWER_SECONDS * 1000)
    })
    ;(async () => {
      for (const [i, piece] of list.entries()) {
        if (settled || req.destroyed) return
        const before = s.bodyPieces
        req.write(piece)
        sent = i + 1
        if (i < list.length - 1) {
          await until(() => s.bodyPieces > before, 1500)
          await wait(20)
          if (req.res) return
        }
      }
      if (!settled) {
        req.end()
        startTimer()
      }
    })()
  })
}

const block = (text, pad = '  ') =>
  text === '' ? `${pad}(nothing)` : text.replace(/\n$/, '').split('\n').map((l) => `${pad}${l}`).join('\n')

/** One request and its answer, for a check's output. */
export function replyText(r) {
  const head = `  ${r.request}`
  if (!r.answered) {
    if (r.hung && r.started) return `${head}\n    the answer began (status ${r.status}) but did not end within ${ANSWER_SECONDS} seconds`
    if (r.hung) return `${head}\n    no answer within ${ANSWER_SECONDS} seconds`
    return `${head}\n    no answer: the connection was closed (${r.error})`
  }
  const lines = [head, `    status: ${r.status}`, `    content-type: ${r.type ?? '(none)'}`]
  if (r.headers?.allow !== undefined) lines.push(`    allow: ${r.headers.allow}`)
  lines.push('    body:', block(r.body, '      '))
  return lines.join('\n')
}

/** What a server run did, for a check's output. */
export function serverReport(s) {
  const where = s.from === '.' ? 'In the top folder' : `In the folder ${s.from}`
  const end = s.flooded
    ? 'stopped by Check: it printed without stopping'
    : s.stillRunning
      ? `stopped by Check: it was still running ${STOP_SECONDS} seconds after Ctrl+C`
      : s.timedOut
        ? 'stopped by Check: it ran too long'
        : s.code === null
          ? s.listening
            ? 'stopped by Check when it was done with it'
            : `stopped by Check: it was not listening after ${LISTEN_SECONDS} seconds`
          : `exit code: ${s.code}`
  const sent = s.replies.length ? ['Check sent:', ...s.replies.map(replyText)] : []
  const ctrlC = s.sigint || s.noListener ? ['Check pressed Ctrl+C after the answer above.'] : []
  const unguarded = s.guarded
    ? []
    : ['(Node on this computer refused the guard that keeps a script writing only inside its copy of the workspace, so Check ran this script without it.)']
  return hide(
    [`${where}: ${s.command}`, ...sent, ...ctrlC, 'standard output:', block(s.stdout), 'standard error:', block(s.stderr), end, ...unguarded].join('\n')
  )
}

export const serverReports = (...runs) => runs.map(serverReport).join('\n\n')

/**
 * The one detail for a server that never got as far as listening, or null when it listened.
 * `script` is the file the task is about.
 */
export async function notListening(name, s, dir, script) {
  const fails = (message) => ({ name, passed: false, message, output: serverReport(s) })
  if (await unwritten(dir, script)) return fails(`${script} holds only the comments from the starter so far. Write your code under them.`)
  if (s.listening && typeof s.listening === 'object') return null
  if (s.flooded) return fails(`${script} printed without stopping, so Check stopped it. Look for a loop that never ends around a console.log.`)
  if (s.code !== null && s.code !== undefined) {
    const found = await broken(name, { ...s, timedOut: false }, dir, script)
    if (found) return fails(found.message)
    if (hasStack(s.stderr)) return fails(`${script} stopped with an error before it was listening: ${errorLine(s.stderr) ?? 'see the output'}.`)
    if (s.asked === null) return fails(`${script} ended without listening for requests. A server listens on a port, and that keeps the script running.`)
    return fails(`${script} ended before it was listening, with exit code ${s.code}.`)
  }
  if (s.asked === null) {
    return fails(`${script} was still running after ${LISTEN_SECONDS} seconds but never started listening, so no request could reach it. Make the server listen on a port.`)
  }
  if (typeof s.listening === 'string') return fails(`${script} listened on ${s.listening}, which is not a port. Turn the setting into a number first.`)
  return fails(`${script} asked to listen but was not listening after ${LISTEN_SECONDS} seconds.`)
}

/** Why the server did not listen on the port in PORT, in words, or null. */
export function portTrouble(s, port) {
  const asked = s.asked?.asked ?? null
  if (asked === null) {
    return `The server did not say which port to listen on, so the system picked one, and nobody would know where to find it. Listen on the port in PORT, ${port} here.`
  }
  if (Number(asked) !== Number(port)) {
    return `With PORT=${port}, the server listened on port ${asked}. Read the port from PORT in the environment each time the server starts, so whoever starts it can choose.`
  }
  return null
}

export const LATE =
  'The server set a header or a status after the answer had begun, which Node refuses with ERR_HTTP_HEADERS_SENT: once the first part of the body is written, the status and the headers have gone. Set them first.'

/** Why a request got no proper answer, in words, or null when it was answered. `s` is the run. */
export function unanswered(r, s) {
  if (r.answered) return null
  if (r.hung && r.started) return `For ${r.request}, the answer began but never ended, so the visitor's page would keep loading. End every answer, once.`
  if (r.hung) return `For ${r.request}, no answer came within ${ANSWER_SECONDS} seconds. A request waits until its answer is ended; check that every path through your code ends the answer.`
  const line = s && hasStack(s.stderr) ? errorLine(s.stderr) : null
  if (line && /ERR_STREAM_WRITE_AFTER_END/.test(line)) {
    return `For ${r.request}, the connection closed with no answer: the server had stopped with ${line}. An earlier request was answered twice. Once an answer is ended, return, so no second answer follows.`
  }
  if (line) return `For ${r.request}, the connection closed with no answer: the server stopped with an error, ${line}`
  return `For ${r.request}, the connection closed with no answer. Look at what the server printed on standard error below.`
}
