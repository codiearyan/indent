// What every check of this repo shares. A check copies the workspace, writes its own files into
// the copy, runs one of the learner's scripts there as `node <script> <args>` with its own
// arguments, and judges what the script printed, its exit code and the files it left behind.
// Node's permission model lets the script write only inside the copy, so nothing a script does
// while Check runs it can reach the rest of the computer. Standard input is closed, so a script
// that waits for typing ends instead of hanging, and a script that never ends is stopped.
import { spawn } from 'node:child_process'
import { mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { childEnv, collect } from '../../kit/sandbox.mjs'

export const SECONDS = 5

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

/** A fresh copy of the workspace by its real path, with `files` ({ rel: text | null }) in it. */
export async function box(t, files = {}) {
  const dir = await realpath(await t.sandbox())
  for (const [rel, text] of Object.entries(files)) await put(dir, rel, text)
  return dir
}

const spawnNode = (args, cwd) =>
  spawn(process.execPath, args, { cwd, env: childEnv(), stdio: ['ignore', 'pipe', 'pipe'] })

const guardFlags = (dir) => ['--permission', '--allow-fs-read=*', `--allow-fs-write=${dir}`]

// Once per Check: if this system's Node refuses a write inside the copy even with the flags, the
// scripts run without them rather than fail every task.
let guard
function guarded(dir) {
  guard ??= (async () => {
    const probe = join(dir, '.permission-probe')
    const code = `require('fs').writeFileSync(${JSON.stringify(probe)}, '')`
    const r = await collect(spawnNode([...guardFlags(dir), '-e', code], dir), 10000)
    await rm(probe, { force: true })
    return r.code === 0
  })()
  return guard
}

const quote = (arg) => (arg === '' || /\s/.test(arg) ? `"${arg}"` : arg)

/**
 * Runs `node <script> <args>` the way a person types it in the folder `from` (relative to dir).
 * Returns { code, stdout, stderr, timedOut, command, from }.
 */
export async function run(dir, script, args = [], { from = '.' } = {}) {
  const cwd = at(dir, from)
  await mkdir(cwd, { recursive: true })
  const file = relative(cwd, at(dir, script))
  const flags = (await guarded(dir)) ? guardFlags(dir) : []
  const r = await collect(spawnNode([...flags, file, ...args], cwd), SECONDS * 1000)
  return { ...r, command: ['node', file, ...args.map(quote)].join(' '), from }
}

const block = (text) =>
  text === '' ? '  (nothing)' : text.replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')

/** What a run did, for a check's output. */
export function report(r) {
  const where = r.from === '.' ? 'In the top folder' : `In the folder ${r.from}`
  return [
    `${where}: ${r.command}`,
    'standard output:',
    block(r.stdout),
    'standard error:',
    block(r.stderr),
    r.timedOut ? `stopped by Check after ${SECONDS} seconds` : `exit code: ${r.code}`
  ].join('\n')
}

export const reports = (...runs) => runs.map(report).join('\n\n')

/** The line of stderr that names the error Node stopped with, or null. */
export function errorLine(stderr) {
  const line = stderr.split('\n').find((l) => /^\s*(\w*Error|Error)\b.*?:/.test(l))
  return line ? line.trim() : null
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

/** Each string in the code that holds a slash or a backslash, import lines left out. */
export function slashStrings(source) {
  const code = withoutComments(source)
    .split('\n')
    .filter((l) => !/^\s*import\b|\bfrom\s*['"]/.test(l))
    .join('\n')
  const found = code.match(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g) ?? []
  return found.filter((s) => s.slice(1, -1).includes('/') || s.includes('\\\\'))
}
