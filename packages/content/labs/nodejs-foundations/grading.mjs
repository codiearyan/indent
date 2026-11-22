// What every check of this repo shares. A check copies the workspace, writes its own files into
// the copy, runs one of the learner's scripts there as `node <script> <args>` with its own
// arguments, and judges what the script printed, its exit code and the files it left behind.
// Node's permission model lets the script write only inside the copy, so nothing a script does
// while Check runs it can reach the rest of the computer. Standard input is closed, so a script
// that waits for typing ends instead of hanging, and a script that never ends is stopped.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { childEnv, clip } from '../../kit/sandbox.mjs'

export const SECONDS = 5
const MAX_READ = 200000

export const pass = (name, output) => ({ name, passed: true, output })
export const fail = (name, message, output) => ({ name, passed: false, message, output })

const at = (dir, rel) => join(dir, ...rel.split('/'))

/** Writes `text` at `rel` under `dir`; null removes the file or folder. */
export async function put(dir, rel, text) {
  const path = at(dir, rel)
  if (text === null) return rm(path, { recursive: true, force: true })
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

export const read = (dir, rel) => readFile(at(dir, rel), 'utf8').catch(() => null)

// Each sandbox copy and the workspace it came from, so what the learner reads names their own files.
const copies = []

/** `text` with every sandbox path written as the workspace path it was copied from. */
export function hide(text) {
  let out = text
  for (const [dir, workspace] of copies) {
    out = out.split(pathToFileURL(dir).href).join(pathToFileURL(workspace).href)
    out = out.split(dir).join(workspace)
  }
  return out
}

/** A fresh copy of the workspace by its real path, with `files` ({ rel: text | null }) in it. */
export async function box(t, files = {}) {
  const dir = await realpath(await t.sandbox())
  copies.push([dir, t.workspace])
  // A link copied from the workspace could lead a write out of the copy, past the guard.
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  for (const [rel, text] of Object.entries(files)) await put(dir, rel, text)
  return dir
}

/**
 * Like the kit's collect, but a script that prints without end is stopped, not held in memory.
 * `onOutput`, when given, sees each piece of standard output as it comes.
 */
function collect(child, timeoutMs, onOutput) {
  let stdout = ''
  let stderr = ''
  let timedOut = false
  let flooded = false
  const take = (kept, chunk) => {
    if (kept.length + chunk.length > MAX_READ && !flooded) {
      flooded = true
      child.kill('SIGKILL')
    }
    return (kept + chunk).slice(0, MAX_READ)
  }
  child.stdout.on('data', (d) => {
    stdout = take(stdout, d)
    onOutput?.(d)
  })
  child.stderr.on('data', (d) => (stderr = take(stderr, d)))
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, timeoutMs)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout: clip(stdout), stderr: clip(stderr), timedOut, flooded })
    })
  })
}

const spawnNode = (args, cwd, { env, input = false } = {}) =>
  spawn(process.execPath, args, { cwd, env: childEnv(env), stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] })

// Calls onLine(line, type) for each whole line of standard output; type(text) writes to standard input.
function talk(child, onLine) {
  child.stdin.on('error', () => {})
  const type = (text) => {
    if (child.stdin.writable) child.stdin.write(text)
  }
  let rest = ''
  return (chunk) => {
    const parts = (rest + chunk).split('\n')
    rest = parts.pop()
    for (const line of parts) onLine(line.replace(/\r$/, ''), type)
  }
}

const guardFlags = (dir) => ['--permission', '--allow-fs-read=*', `--allow-fs-write=${dir}`]

// Once per Check: if this system's Node refuses a write inside the copy even with the flags, the
// scripts run without them rather than fail every task, and every report says so. The probe writes
// into a folder made for it, so nothing in the workspace can make it fail.
let guard
function guarded(dir) {
  guard ??= (async () => {
    const folder = await mkdtemp(join(dir, '.permission-probe-'))
    const code = `require('fs').writeFileSync(${JSON.stringify(join(folder, 'probe'))}, '')`
    const r = await collect(spawnNode([...guardFlags(dir), '-e', code], dir), 10000)
    await rm(folder, { recursive: true, force: true })
    return r.code === 0
  })()
  return guard
}

const quote = (arg) => (arg === '' || /\s/.test(arg) ? `"${arg}"` : arg)

/**
 * Runs `node <script> <args>` the way a person types it in the folder `from` (relative to dir).
 * `preload`, a module in dir, runs first and is left out of the command shown.
 * `env` sets settings in its environment (undefined removes one) and `memory` caps its data in MB;
 * either shows the command the way try.js takes it. With `onLine(line, type)`, standard input
 * stays open, like a terminal where nobody types, and type(text) types into it.
 * Returns { code, stdout, stderr, timedOut, flooded, command, from, guarded, memory }.
 */
export async function run(dir, script, args = [], { from = '.', preload, env, memory, onLine } = {}) {
  const cwd = at(dir, from)
  await mkdir(cwd, { recursive: true })
  const file = relative(cwd, at(dir, script))
  const flags = (await guarded(dir)) ? guardFlags(dir) : []
  const before = preload ? ['--import', pathToFileURL(at(dir, preload)).href] : []
  const limit = memory ? [`--max-old-space-size=${memory}`] : []
  const child = spawnNode([...flags, ...limit, ...before, file, ...args], cwd, { env, input: Boolean(onLine) })
  const r = await collect(child, SECONDS * 1000, onLine && talk(child, onLine))
  const settings = Object.entries(env ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => quote(`${k}=${v}`))
  const helper = env || memory ? ['try.js', ...settings, ...(memory ? [`--memory=${memory}`] : [])] : []
  const command = ['node', ...helper, file, ...args.map(quote)].join(' ')
  return { ...r, command, from, guarded: flags.length > 0, memory }
}

/** True when Node stopped because the script's data outgrew the memory it was given. */
export const outOfMemory = (stderr) => /JavaScript heap out of memory/.test(stderr)

const block = (text) =>
  text === '' ? '  (nothing)' : text.replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')

/** What a run did, for a check's output. */
export function report(r) {
  const where = r.from === '.' ? 'In the top folder' : `In the folder ${r.from}`
  const oom = r.memory && outOfMemory(r.stderr)
  const end = r.flooded
    ? 'stopped by Check: it printed without stopping'
    : r.timedOut
      ? `stopped by Check after ${SECONDS} seconds`
      : oom
        ? `stopped by Node: it ran out of the ${r.memory} MB it was given`
        : `exit code: ${r.code}`
  const stderr = oom ? r.stderr.split('\n').filter((l) => l.startsWith('FATAL ERROR')).join('\n') : r.stderr
  const unguarded = r.guarded
    ? []
    : ['(Node on this computer refused the guard that keeps a script writing only inside its copy of the workspace, so Check ran this script without it.)']
  return hide(
    [`${where}: ${r.command}`, 'standard output:', block(r.stdout), 'standard error:', block(stderr), end, ...unguarded].join('\n')
  )
}

export const reports = (...runs) => runs.map(report).join('\n\n')

/** The line of stderr that names the error Node stopped with, or null. */
export function errorLine(stderr) {
  const line = stderr.split('\n').find((l) => /^\s*(\w*Error|Error)\b.*?:/.test(l))
  return line ? hide(line.trim()) : null
}

export const hasStack = (stderr) => /^\s+at .+/m.test(stderr)

/** True when Node itself stopped on an error nobody caught: it ends with its version line. */
export const uncaught = (stderr) => hasStack(stderr) && /^Node\.js v\d/m.test(stderr)

/** Lines of output, without the last line break. */
export const lines = (text) => (text === '' ? [] : text.replace(/\n$/, '').split('\n'))

/** Code with comments removed, strings kept. */
export function withoutComments(source) {
  return source.replace(
    /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (m) => (m.startsWith('/') ? '' : m)
  )
}

/** True when the file holds nothing but comments, as the starter gave it. */
export async function unwritten(dir, script) {
  const source = await read(dir, script)
  return source !== null && withoutComments(source).trim() === ''
}

/**
 * The one detail for a run that went wrong in a way every task words the same, or null.
 * `script` is the file the task is about.
 */
export async function broken(name, r, dir, script) {
  if (await unwritten(dir, script)) {
    return fail(name, `${script} holds only the comment from the starter so far. Write your code under it.`, report(r))
  }
  if (r.timedOut) {
    return fail(
      name,
      `${script} did not end within ${SECONDS} seconds, so Check stopped it. A script ends by itself once its last line has run and nothing is left to wait for. Look for a loop that never stops, a timer that keeps going, or a wait for typing.`,
      report(r)
    )
  }
  if (r.flooded) {
    return fail(
      name,
      `${script} printed without stopping, so Check stopped it. Look for a loop that never ends around a console.log.`,
      report(r)
    )
  }
  if (r.code === 13) {
    return fail(
      name,
      `${script} ended while an await was still waiting for something that never came, such as a person typing. Check gives a script no typing: everything it needs comes from its arguments and its files.`,
      report(r)
    )
  }
  const error = errorLine(r.stderr) ?? ''
  const missingExport = /does not provide an export named '([^']+)'/.exec(error)
  if (missingExport) {
    return fail(
      name,
      `A file imports ${missingExport[1]} from a module that has no export by that name, so nothing ran. Compare the name in the import with the name after export in that module, letter by letter. A default export is not a named one.`,
      report(r)
    )
  }
  if (/SyntaxError/.test(error)) {
    return fail(
      name,
      `Node cannot read the code of ${script}, so nothing in it ran. Run it in the terminal: the lines above the SyntaxError point at the place, with a ^ under it.`,
      report(r)
    )
  }
  const bare = /Cannot find package '([^']+)'/.exec(error)?.[1]
  if (bare && (bare.endsWith('.js') || (await read(dir, `${bare}.js`)) !== null)) {
    return fail(
      name,
      `${script} imports ${bare} as if it were a package someone installed, so nothing ran. A file of your own is imported by its path, which starts with ./ and ends with .js.`,
      report(r)
    )
  }
  if (/ERR_MODULE_NOT_FOUND/.test(error) && /Cannot find module/.test(error)) {
    return fail(
      name,
      `A file of your own that ${script} imports cannot be found, so nothing ran. Its name starts with ./ and ends with .js, as the file is called on disk.`,
      report(r)
    )
  }
  if (/ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_BUILTIN_MODULE/.test(error)) {
    return fail(
      name,
      `Node cannot find a module that ${script} imports, so nothing in it ran. Compare the name after from with the one in the lesson, letter by letter, node: prefix included.`,
      report(r)
    )
  }
  if (/ERR_IMPORT_ATTRIBUTE_MISSING/.test(error)) {
    return fail(
      name,
      `${script} imports a JSON file without saying that it is JSON, so nothing ran. The lesson shows the words that go after the import.`,
      report(r)
    )
  }
  if (/ERR_ACCESS_DENIED/.test(r.stderr) && /ChildProcess|WorkerThreads|--allow-child-process|--allow-worker/.test(r.stderr)) {
    return fail(
      name,
      `${script} tried to start another program or thread, and Check does not let a script do that. Everything this task asks for can be done in the script itself.`,
      report(r)
    )
  }
  if (/ERR_ACCESS_DENIED/.test(r.stderr)) {
    return fail(
      name,
      `${script} tried to write to a place outside its workspace, and Check does not let a script do that. Every file it writes should be inside the workspace folder.`,
      report(r)
    )
  }
  return null
}

/** True when `printed` is the same path as `expected`, whatever the case of the letters on Windows. */
export async function samePath(printed, expected) {
  const real = await realpath(printed).catch(() => null)
  return real !== null && relative(real, expected) === ''
}

/**
 * Each string in the code that looks like a path put together or taken apart by hand: one word
 * with a slash in it, a backslash, or a slash next to a ${} in a template. Import lines, web
 * addresses and sentences with a path in them, like a line that says what to type, are left out.
 */
export function slashStrings(source) {
  const code = withoutComments(source)
    .split('\n')
    .filter((l) => !/^\s*import\b|\bfrom\s*['"]|\bimport\s*\(/.test(l))
    .join('\n')
  const found = code.match(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g) ?? []
  return found.filter((s) => {
    const text = s.slice(1, -1)
    if (s.includes('\\\\') || (s.startsWith('`') && /\}\/|\/\$\{/.test(text))) return true
    return text.includes('/') && !/\s/.test(text) && !/^[a-z]+:\/\//i.test(text)
  })
}
