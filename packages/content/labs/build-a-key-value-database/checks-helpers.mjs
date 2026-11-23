// Shared by every issue's grader/checks.mjs. Each case runs one export of grader/drive.mjs in its
// own Node process, in a fresh folder of its own inside the sandbox copy. Node's permission flags
// let that process write only inside its folder; it gets a small environment and no standard
// input, and it is stopped when it runs too long, so a hang or a crash stays inside one case.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, realpath, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = (file) => fileURLToPath(new URL(file, import.meta.url))
const SECONDS = 5
const MAX_READ = 100000
const POOL = 4

const KEPT = /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LANG)$/i
const smallEnv = () => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => KEPT.test(key))),
  NO_COLOR: '1',
  NODE_NO_WARNINGS: '1'
})

function collect(child, timeoutMs) {
  let stdout = ''
  let stderr = ''
  let timedOut = false
  const take = (kept, chunk) => {
    if (kept.length + chunk.length > MAX_READ) child.kill('SIGKILL')
    return (kept + chunk).slice(-MAX_READ)
  }
  child.stdout.on('data', (d) => (stdout = take(stdout, d)))
  child.stderr.on('data', (d) => (stderr = take(stderr, d)))
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, timeoutMs)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

const guardFlags = (folder) => ['--permission', '--allow-fs-read=*', `--allow-fs-write=${folder}`]

// Once per Check: if this system's Node refuses a write inside a folder even with the flags, the
// cases run without them rather than fail every task, and every report says so.
let guard
function guarded(dir) {
  guard ??= (async () => {
    const folder = await mkdtemp(join(dir, '.permission-probe-'))
    const code = `require('fs').writeFileSync(${JSON.stringify(join(folder, 'probe'))}, '')`
    const child = spawn(process.execPath, [...guardFlags(folder), '-e', code], { env: smallEnv() })
    const r = await collect(child, 10000)
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

export const ALLOWED = ['node:fs', 'node:fs/promises', 'node:path', 'node:buffer', 'fs', 'fs/promises', 'path', 'buffer']

// The store is built on Node's own file functions. Anything else a file in src/ brings in, a
// ready-made database above all, is named here before any case runs.
async function refused(dir) {
  const names = (await readdir(join(dir, 'src'))).filter((name) => /\.(m?js)$/.test(name))
  for (const name of names) {
    const code = withoutComments(await readFile(join(dir, 'src', name), 'utf8'))
    const specs = [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]/g)]
      .map((m) => m[1] ?? m[2] ?? m[3] ?? m[4])
    const other = specs.find((spec) => !spec.startsWith('.') && !ALLOWED.includes(spec))
    const sneaky = /sqlite|getBuiltinModule|createRequire|\brequire\s*\(/.exec(code)?.[0]
    if (other || sneaky) return { file: `src/${name}`, what: other ?? sneaky }
  }
  return undefined
}

async function pool(items, size, fn) {
  const out = []
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return out
}

async function runOne(dir, folder, c, flags, hide) {
  const args = [...flags, join(dir, '.grader', 'run.mjs'), c.run, JSON.stringify(c.args ?? []), folder]
  const child = spawn(process.execPath, args, { cwd: dir, env: smallEnv(), stdio: ['ignore', 'pipe', 'pipe'] })
  const r = await collect(child, (c.seconds ?? SECONDS) * 1000)
  const at = [...r.stderr.matchAll(/^@@at (.*)$/gm)].at(-1)?.[1]
  const last = r.stdout.trimEnd().split('\n').at(-1) ?? ''
  let reply
  try {
    reply = last.startsWith('{"reply":') ? JSON.parse(last).reply : undefined
  } catch {}
  if (reply && !r.timedOut) return { ...reply, error: reply.error && hide(reply.error), at }
  const stderr = hide(r.stderr.replace(/^@@at .*\n?/gm, '').trim())
  return { ok: false, timedOut: r.timedOut, error: r.timedOut ? 'Timed out' : stderr || `Exited with code ${r.code}`, at }
}

const STUCK =
  'Your code never finished here, so the check stopped it after a few seconds. Look for a loop that does not move forward, such as one that reads a broken record again and again, or a promise that never settles.'

// Said once instead of failing every case: a file that brings in more than Node's file functions,
// a file that does not load, code that still throws 'Not implemented', an earlier task not done.
function blocker(runs, unwritten, banned) {
  if (banned) {
    return {
      name: 'Only Node\'s own file functions',
      passed: false,
      message: `${banned.file} uses ${banned.what}. Ashgrove's database is built from plain JavaScript and Node's own file and path functions, so no ready-made database and no package: keep the keys and values yourself.`,
      output: `${banned.file}: ${banned.what}`
    }
  }
  const refusedImport = runs.find((r) => !r.ok && /RefusedImport: /.test(r.error))
  if (refusedImport) {
    const what = refusedImport.error.match(/RefusedImport: (\S+)/)[1]
    return {
      name: 'Only Node\'s own file functions',
      passed: false,
      message: `A file in src/ brings in ${what}. Ashgrove's database is built from plain JavaScript and Node's own file and path functions only.`,
      output: `RefusedImport: ${what}`
    }
  }
  const broken = runs.find(
    (r) => !r.ok && /SyntaxError|does not provide an export|Cannot find module|ERR_MODULE_NOT_FOUND/.test(r.error)
  )
  if (broken) {
    return {
      name: 'Your files load',
      passed: false,
      message: 'A file in src/ does not load, so this task cannot be checked. Fix the error below first.',
      output: broken.error
    }
  }
  const isEarlier = (r) => !r.ok && r.error?.includes('NeedsEarlierTask: ')
  if (runs.some((r) => !isEarlier(r) && /Not implemented/.test(r.ok ? r.value?.seen ?? '' : r.error))) {
    return {
      name: 'Your code is written',
      passed: false,
      message: `${unwritten} still throws 'Not implemented'. Replace that line with your code.`,
      output: 'Error: Not implemented'
    }
  }
  const earlier = runs.find(isEarlier)
  if (earlier) {
    return {
      name: 'Earlier tasks are done',
      passed: false,
      message: earlier.error.split('NeedsEarlierTask: ')[1].split('\n')[0],
      output: earlier.error.match(/NeedsEarlierTask: .*/)[0]
    }
  }
  return undefined
}

/**
 * Runs each case and turns what it gave into a detail. A case is { name, run, args, setup, hint,
 * hints, denied }: `run` names an export of grader/drive.mjs, called as run(folder, ...args) in its own
 * process. It returns { ok, seen, why }; `why` picks a message from `hints`, `hint` is the default,
 * `hints.threw` is added when the case threw, and `denied` replaces what a write outside is told.
 * `files` adds files to the sandbox ({ rel: absolute source }).
 */
export async function runCases(t, unwritten, cases, { files = {} } = {}) {
  const dir = await realpath(
    await t.sandbox({
      '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
      '.grader/helpers.mjs': here('./drive-helpers.mjs'),
      '.grader/run.mjs': here('./run-case.mjs'),
      ...files
    })
  )
  // A link copied from the workspace could lead a write out of the copy, past the guard.
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isSymbolicLink()) await rm(join(entry.parentPath, entry.name))
  }
  const banned = await refused(dir)
  if (banned) return [blocker([], unwritten, banned)]
  const useGuard = await guarded(dir)
  const hide = (text) =>
    String(text)
      .replace(/(?:file:\/\/)?\/[^\s'"]*\/\.cases\/\d+\//g, '')
      .split(pathToFileURL(dir).href)
      .join(pathToFileURL(t.workspace).href)
      .split(dir)
      .join(t.workspace)
  const runs = await pool(cases, POOL, async (c, i) => {
    const folder = join(dir, '.cases', String(i))
    await mkdir(folder, { recursive: true })
    return runOne(dir, folder, c, useGuard ? guardFlags(folder) : [], hide)
  })
  const stop = blocker(runs, unwritten)
  if (stop) return [stop]
  const unguarded = useGuard
    ? ''
    : '\n(Node on this computer refused the guard that keeps your code writing only inside its own folder, so Check ran it without that guard.)'
  return cases.map((c, i) => {
    const r = runs[i]
    const v = r.ok ? r.value : undefined
    const passed = Boolean(v?.ok)
    const hint = (v?.why && c.hints?.[v.why]) ?? c.hint
    const seen = r.ok
      ? v.seen
      : r.timedOut
        ? `stopped after a few seconds${r.at ? `, while ${r.at}` : ''}`
        : r.error
    const message = passed
      ? undefined
      : r.ok
        ? hint
        : r.timedOut
          ? STUCK
          : /ERR_ACCESS_DENIED/.test(r.error)
            ? c.denied ?? 'Your code tried to write outside the folder it was given, and Check does not let it. Every file the store writes goes inside the folder open() was given.'
            : `Your code threw the error below here.${c.hints?.threw ? ` ${c.hints.threw}` : ''}`
    return { name: c.name, passed, message, output: `${c.setup}\n${seen}${unguarded}` }
  })
}
