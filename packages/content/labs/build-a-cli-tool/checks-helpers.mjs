// Shared by every issue's grader/checks.mjs. A check runs the learner's tool the way a person
// would, `node orders.js <args>`, with standard input and an environment of its own, and reads
// standard output, standard error and the exit code apart. Every run, and every direct call of a
// learner's function, happens in its own Node process, in a fresh folder inside the sandbox copy.
// Node's permission flags let that process write only inside its folder; it gets a small
// environment, and it is stopped when it runs too long or prints without end.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = (file) => fileURLToPath(new URL(file, import.meta.url))
export const SECONDS = 5
const MAX_READ = 200000

export const pass = (name, output) => ({ name, passed: true, output })
export const fail = (name, message, output) => ({ name, passed: false, message, output })

// The tool starts no other program, so it needs no PATH or HOME; Windows needs these two.
const KEPT = /^(SYSTEMROOT|WINDIR)$/i
const smallEnv = (extra = {}) => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => KEPT.test(key))),
  NODE_NO_WARNINGS: '1',
  ...extra
})

const guardFlags = (folder) => ['--permission', '--allow-fs-read=*', `--allow-fs-write=${folder}`]

function collect(child, { seconds = SECONDS, closeAfter, moreInput } = {}) {
  let stdout = ''
  let stderr = ''
  let timedOut = false
  let flooded = false
  let closed = false
  const take = (kept, chunk) => {
    if (kept.length + chunk.length > MAX_READ && !flooded) {
      flooded = true
      child.kill('SIGKILL')
    }
    return (kept + chunk).slice(0, MAX_READ)
  }
  child.stdout.on('data', (d) => {
    if (closed) return
    stdout = take(stdout, d)
    if (closeAfter !== undefined && stdout.split('\n').length > closeAfter) {
      // Like a reader that has seen enough: keep the first lines and close this end of the pipe.
      closed = true
      stdout = stdout.split('\n').slice(0, closeAfter).join('\n') + '\n'
      child.stdout.destroy()
      if (moreInput !== undefined && child.stdin?.writable) child.stdin.write(moreInput)
    }
  })
  child.stderr.on('data', (d) => (stderr = take(stderr, d)))
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, seconds * 1000)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr, timedOut, flooded, closed })
    })
  })
}

// Once per Check: if this system's Node refuses a write inside a folder even with the flags, the
// cases run without them rather than fail every task, and every report says so.
let guard
function guarded(dir) {
  guard ??= (async () => {
    const folder = await mkdtemp(join(dir, '.permission-probe-'))
    const code = `require('fs').writeFileSync(${JSON.stringify(join(folder, 'probe'))}, '')`
    const child = spawn(process.execPath, [...guardFlags(folder), '-e', code], { env: smallEnv() })
    const r = await collect(child, { seconds: 10 })
    await rm(folder, { recursive: true, force: true })
    return r.code === 0
  })()
  return guard
}

/** Code with comments removed, strings kept. */
export function withoutComments(source) {
  return source.replace(
    /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (m) => (m.startsWith('/') ? '' : m)
  )
}

/** The learner's own .js files, relative to the workspace. */
async function learnerFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && /\.(m?js)$/.test(e.name))
    .map((e) => relative(dir, join(e.parentPath, e.name)).split('\\').join('/'))
    .filter((rel) => !/^(\.grader|\.cases|node_modules)\//.test(rel))
}

/**
 * A fresh copy of the workspace with the check's helpers in .grader/. Returns the box every run
 * and call takes.
 */
export async function box(t, { noUtil = false } = {}) {
  const dir = await realpath(
    await t.sandbox({
      '.grader/call.mjs': here('./call-case.mjs'),
      '.grader/tty.mjs': here('./preload-tty.mjs'),
      '.grader/slow-pipe.mjs': here('./preload-slow-pipe.mjs'),
      '.grader/no-util.mjs': here('./preload-no-util.mjs'),
      '.grader/closed-pipe.mjs': here('./preload-closed-pipe.mjs')
    })
  )
  // A link copied from the workspace could lead a write out of the copy, past the guard.
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  const hide = (text) =>
    String(text)
      .replace(/(?:file:\/\/)?[^\s'"]*[\\/]\.cases[\\/]\d+[\\/]/g, '')
      .split(pathToFileURL(dir).href)
      .join(pathToFileURL(t.workspace).href)
      .split(dir)
      .join(t.workspace)
  return { dir, hide, noUtil, cases: 0, useGuard: await guarded(dir) }
}

async function caseFolder(b, files) {
  const folder = join(b.dir, '.cases', String(b.cases++))
  await mkdir(folder, { recursive: true })
  for (const [name, text] of Object.entries(files)) {
    await mkdir(dirname(join(folder, name)), { recursive: true })
    await writeFile(join(folder, name), text)
  }
  return folder
}

const quote = (arg) => (arg === '' || /[\s"'<>|&;$]/.test(arg) ? `'${arg}'` : arg)

/**
 * Runs `node orders.js <args>` in a fresh folder holding `files` ({ name: text }).
 * `stdin`: text typed into standard input, which is then closed; `stdinOpen`: input stays open
 * and nobody types, as at a terminal; with neither, standard input is empty.
 * `env`: the settings in its environment. `tty`: standard output answers as a terminal.
 * `slowPipe`: what the tool writes reaches the check a moment later. `memory`: MB for its data.
 * `closeAfter`: the check closes its end of standard output after that many lines, then types
 * `moreInput`. Returns what it printed on each stream and how it ended.
 */
export async function run(b, args, opts = {}) {
  const { files = {}, stdin, stdinOpen, env = {}, tty, slowPipe, memory, seconds, closeAfter, moreInput } = opts
  const folder = await caseFolder(b, files)
  const closing = closeAfter !== undefined && 'closed-pipe.mjs'
  const preloads = [b.noUtil && 'no-util.mjs', tty && 'tty.mjs', slowPipe && 'slow-pipe.mjs', closing].filter(Boolean)
  const flags = [
    ...(b.useGuard ? guardFlags(folder) : []),
    ...(memory ? [`--max-old-space-size=${memory}`] : []),
    ...preloads.flatMap((p) => ['--import', pathToFileURL(join(b.dir, '.grader', p)).href])
  ]
  const input = stdin !== undefined || stdinOpen
  const child = spawn(process.execPath, [...flags, join(b.dir, 'orders.js'), ...args], {
    cwd: folder,
    env: smallEnv(env),
    stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe']
  })
  if (input) {
    child.stdin.on('error', () => {})
    if (stdin !== undefined) child.stdin.write(stdin)
    if (!stdinOpen) child.stdin.end()
  }
  const r = await collect(child, { seconds: seconds ?? SECONDS, closeAfter, moreInput })
  const settings = Object.entries(env).map(([k, v]) => `${k}=${quote(v)}`)
  const command = [...settings, 'node', 'orders.js', ...args.map(quote)].join(' ')
  return { ...r, command, files: Object.keys(files), opts, guarded: b.useGuard, hide: b.hide }
}

/** Calls one export of a learner's module with JSON arguments, in a fresh folder of its own. */
export async function call(b, file, name, args, { files = {} } = {}) {
  const folder = await caseFolder(b, files)
  const flags = [
    ...(b.useGuard ? guardFlags(folder) : []),
    ...(b.noUtil ? ['--import', pathToFileURL(join(b.dir, '.grader', 'no-util.mjs')).href] : [])
  ]
  const child = spawn(process.execPath, [...flags, join(b.dir, '.grader', 'call.mjs'), file, name, JSON.stringify(args)], {
    cwd: folder,
    env: smallEnv(),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const r = await collect(child)
  const last = r.stdout.trimEnd().split('\n').at(-1) ?? ''
  let reply
  try {
    reply = last.startsWith('{"reply":') ? JSON.parse(last).reply : undefined
  } catch {}
  if (reply && !r.timedOut) return { ...reply, error: reply.error && b.hide(reply.error) }
  return {
    ok: false,
    timedOut: r.timedOut,
    error: r.timedOut ? 'stopped after a few seconds' : b.hide(r.stderr.trim()) || `exited with code ${r.code}`
  }
}

// Colour codes are shown as text, so a person can see where they are.
const block = (text) =>
  text === ''
    ? '  (nothing)'
    : text.replace(/\n$/, '').replaceAll('\x1b', '\\x1b').split('\n').map((l) => `  ${l}`).join('\n')

/** What a run did, for a check's output: the command, each stream and how it ended. */
export function report(r) {
  const { stdin, stdinOpen, tty, slowPipe, memory, closeAfter, moreInput } = r.opts
  const lines = [r.files.length ? `In a fresh folder with ${r.files.join(', ')}:` : 'In a fresh folder:', `  ${r.command}`]
  if (tty) lines.push('  (standard output stands in for a terminal)')
  if (slowPipe) lines.push('  (standard output and standard error are a pipe that takes a moment)')
  if (memory) lines.push(`  (with ${memory} MB of memory for its data)`)
  if (stdin !== undefined) {
    const count = stdin.split('\n').filter(Boolean).length
    lines.push(`standard input: ${count} ${count === 1 ? 'line' : 'lines'} typed${stdinOpen ? ', then left open' : ', then closed'}`)
  } else if (stdinOpen) {
    lines.push('standard input: left open, nobody types')
  }
  if (closeAfter !== undefined) {
    lines.push(`  (Check read ${closeAfter} lines and then closed its end of standard output${moreInput ? ', then typed more lines' : ''})`)
  }
  const oom = memory && /heap out of memory|Allocation failed/.test(r.stderr)
  const end = oom
    ? `stopped by Node: it ran out of the ${memory} MB it was given`
    : r.flooded
    ? 'stopped by Check: it printed without stopping'
    : r.timedOut
      ? `stopped by Check after ${r.opts.seconds ?? SECONDS} seconds`
      : r.code === null
        ? `stopped by the signal ${r.signal}`
        : `exit code: ${r.code}`
  const stderr = oom ? r.stderr.split('\n').filter((l) => l.startsWith('FATAL ERROR')).join('\n') : r.stderr
  lines.push('standard output:', block(r.stdout), 'standard error:', block(stderr), end)
  if (!r.guarded) {
    lines.push('(Node on this computer refused the guard that keeps the tool writing only inside its own folder, so Check ran it without that guard.)')
  }
  return r.hide(lines.join('\n'))
}

export const reports = (...runs) => runs.map(report).join('\n\n')

/** Lines of a stream, without the last line break. */
export const lines = (text) => (text === '' ? [] : text.replace(/\r?\n$/, '').split(/\r?\n/))

export const hasStack = (text) => /^\s+at .+/m.test(text)

/** True when the tool printed this line on either stream, wherever. */
export const said = (r, line) => [...lines(r.stdout), ...lines(r.stderr)].some((l) => l.trim() === line)

/** Reads the learner's own code and names a file that brings in node:util, or undefined. */
export async function usesUtil(b) {
  for (const rel of await learnerFiles(b.dir)) {
    const code = withoutComments(await readFile(join(b.dir, rel), 'utf8'))
    const what = /['"](?:node:)?util['"]|\bparseArgs\b|getBuiltinModule|createRequire/.exec(code)?.[0]
    if (what) return { file: rel, what: what.replace(/['"]/g, '') }
  }
  return undefined
}

const LOAD = /SyntaxError|does not provide an export named|ERR_MODULE_NOT_FOUND|Cannot find module|ReferenceError: \w+ is not defined/

/**
 * The one reason, said once, that stops a whole task before its cases are judged: a file that does
 * not load, code that still throws 'Not implemented', node:util where it is refused. `runs` are
 * tool runs and call results; `unwritten` names what still throws.
 */
export function blocker(name, runs, unwritten) {
  const texts = runs.map((r) => (r.command ? `${r.stdout}\n${r.stderr}` : r.ok ? '' : String(r.error)))
  const refused = texts.find((t) => /RefusedImport: /.test(t))
  if (refused) {
    const what = refused.match(/RefusedImport: (\S+)/)[1]
    return fail(name, `Your code brings in ${what}. In this issue you write the reader of the arguments yourself, so Node's own reader is not used here.`, `RefusedImport: ${what}`)
  }
  const broken = runs.find((r, i) => LOAD.test(texts[i]) && (r.command ? hasStack(r.stderr) : true))
  if (broken) {
    return fail(
      name,
      'A file of the tool does not load, so this task cannot be checked. Run the command below in the terminal and fix the error it shows first.',
      broken.command ? report(broken) : broken.error
    )
  }
  const unfinished = runs.find((r, i) => /Not implemented/.test(texts[i]))
  if (unfinished) {
    return fail(
      name,
      `${unwritten} still throws 'Not implemented'. Replace that line with your code.`,
      unfinished.command ? report(unfinished) : unfinished.error
    )
  }
  const stuck = runs.find((r) => r.timedOut)
  if (stuck && !stuck.command) {
    return fail(name, 'Your function never finished, so Check stopped it after a few seconds. Look for a loop that does not move on to the next word.', stuck.error)
  }
  return undefined
}

/** The same reason for every case is said once. */
export const once = (results) =>
  results.length > 1 && results.every((r) => !r.passed && r.message === results[0].message) ? [results[0]] : results

// The check's own order files: never the shop's, so no output can be typed in.
export const WEEK = [
  '# Orders the check made up',
  '2101,poster,60,kraft,2026-12-02',
  '2102,card,1000,cotton,2026-12-03',
  '',
  '2103,invite,45,linen,2026-12-04',
  '2104,envelope,200,cotton,2026-12-02',
  ''
].join('\n')
export const LATE = [
  '2105,card,75,linen,2026-12-05',
  '2106,poster,twelve,kraft,2026-12-06',
  '2107,menu,50,cotton,2026-12-07',
  '# the end of the list',
  '2108,invite,30,cotton',
  ''
].join('\n')

/**
 * What the shop's own command gives for these files and flags, run by the given src/shop.js of
 * the issue's starter: { results: [{ text, value }], notes, ok }.
 */
export async function expected(t, command, files, flags = {}) {
  const shop = await import(pathToFileURL(t.chapterPath('starter/src/shop.js')).href)
  const run = { count: shop.countOrders, list: shop.listOrders, check: shop.checkOrders }[command]
  async function* orderLines() {
    for (const [name, text] of Object.entries(files)) {
      const all = text.split('\n')
      if (all.at(-1) === '') all.pop()
      for (const [i, line] of all.entries()) yield { file: name, line: i + 1, text: line }
    }
  }
  const results = []
  const notes = []
  const ok = await run(orderLines(), flags, { result: (text, value) => results.push({ text, value }), note: (text) => notes.push(text) })
  return { results, notes, ok }
}

const PAPERS = ['cotton', 'linen', 'kraft']
const ITEMS = ['card', 'invite', 'poster', 'envelope']
/** n made-up order lines, all of them right, the same on every run. */
export function manyOrders(n, first = 3000) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(`${first + i},${ITEMS[i % 4]},${(i % 97) + 1},${PAPERS[i % 3]},2026-12-${String((i % 28) + 1).padStart(2, '0')}`)
  }
  return out.join('\n') + '\n'
}
