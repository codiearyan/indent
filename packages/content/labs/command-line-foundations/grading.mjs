// What the issue graders share. They read the learner's workspace as it is on disk, never a copy:
// the work is the state the learner's commands left behind.
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { chmodSync, lstatSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { relative, sep } from 'node:path'

export const check = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

/** Names in a folder exactly as written; a Mac's disk would match `Receipts` for `receipts`. */
export function names(dir) {
  try {
    return readdirSync(dir).filter((name) => name !== '.DS_Store')
  } catch {
    return []
  }
}

function kindOf(path) {
  try {
    const s = statSync(path)
    return s.isDirectory() ? 'dir' : s.isFile() ? 'file' : null
  } catch {
    return null
  }
}

/** 'dir', 'file' or null for `parts` under `root`, matching every name with its exact case. */
export function kind(root, ...parts) {
  let path = root
  for (const part of parts) {
    if (kindOf(path) !== 'dir' || !names(path).includes(part)) return null
    path = join(path, part)
  }
  return kindOf(path)
}

export const isDir = (root, ...parts) => kind(root, ...parts) === 'dir'
export const isFile = (root, ...parts) => kind(root, ...parts) === 'file'

export function read(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function real(path) {
  try {
    return realpathSync(path)
  } catch {
    return null
  }
}

/** Every file under `dir` as a forward-slash path, hidden ones and the app's folder left out. */
export function filesUnder(dir, prefix = '') {
  return names(join(dir, prefix))
    .filter((name) => !name.startsWith('.'))
    .flatMap((name) => {
      const rel = prefix ? `${prefix}/${name}` : name
      const k = kindOf(join(dir, rel))
      return k === 'dir' ? filesUnder(dir, rel) : k === 'file' ? [rel] : []
    })
}

/** Where a file with exactly this content sits now, as workspace paths. */
export function findByContent(root, content) {
  return filesUnder(root).filter((rel) => read(join(root, rel)) === content)
}

export const findByName = (root, name) =>
  filesUnder(root).filter((rel) => rel.split('/').pop() === name)

/** A starter file's content, to recognise it wherever the learner put it. */
export const starterText = (t, rel) => read(t.chapterPath(`starter/${rel}`))

/** A listing for a check's output, like `ls` prints it. */
export const listing = (root, ...parts) => {
  const found = names(join(root, ...parts)).filter((name) => !name.startsWith('.'))
  return found.length ? found.join('\n') : '(empty)'
}

const NOTES = 'notes.txt'

/**
 * The answers in notes.txt, a `key: value` line each. A key whose line is gone maps to null.
 * Quotes around a whole answer are dropped, since people often add them.
 */
export function readNotes(t, keys) {
  const text = read(join(t.workspace, NOTES))
  if (text === null) return null
  const answers = {}
  for (const key of keys) {
    const line = text.split(/\r?\n/).find((l) => new RegExp(`^\\s*${key}\\s*:`, 'i').test(l))
    if (line === undefined) {
      answers[key] = null
      continue
    }
    let value = line.slice(line.indexOf(':') + 1).trim()
    const quoted = value.match(/^(['"`])(.*)\1$/)
    if (quoted) value = quoted[2].trim()
    answers[key] = value
  }
  return answers
}

/** The one detail for an answer that is not there yet, or null when there is one to judge. */
export function missingAnswer(name, notes, key) {
  if (notes === null) {
    return check(name, false, `${NOTES} is missing from the top folder. Reset brings it back.`, '')
  }
  if (notes[key] === null) {
    return check(
      name,
      false,
      `${NOTES} has no line that starts with ${key}: so there is nowhere to read this answer. Put that line back, with your answer after the colon.`,
      ''
    )
  }
  if (notes[key] === '') {
    return check(name, false, `Nothing is written after ${key}: in ${NOTES} yet.`, `${key}:`)
  }
  return null
}

/** `~` and `~/...` as the shell reads them. */
export const expandHome = (value) =>
  value === '~' ? homedir() : value.startsWith('~/') ? join(homedir(), value.slice(2)) : value

/** A file's lines, each trimmed, without the empty lines at its end; null when it cannot be read. */
export function linesOf(path) {
  const text = read(path)
  if (text === null) return null
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** A starter file's lines, as linesOf reads them. */
export const starterLines = (t, rel) => linesOf(t.chapterPath(`starter/${rel}`))

/** True when a starter file in the workspace is no longer as it started. */
export const changed = (t, rel) =>
  read(join(t.workspace, ...rel.split('/'))) !== starterText(t, rel)

/**
 * The lines of a file the learner saved output into, in the top folder. When there is nothing to
 * judge yet, `failed` is the one detail that says why.
 */
export function saved(t, name, file) {
  const ws = t.workspace
  const fail = (message, output = '') => ({ failed: check(name, false, message, output) })
  const k = kind(ws, file)
  if (k === 'file') {
    const lines = linesOf(join(ws, file))
    if (lines.length) return { lines }
    return fail(
      `${file} is empty: the command before > printed nothing into it. Run that command without > first and read what it prints.`
    )
  }
  if (k === 'dir')
    return fail(
      `${file} in the top folder is a folder. Check wants a file of that name.`,
      listing(ws)
    )
  const other = names(ws).find((n) => n.toLowerCase() === file.toLowerCase())
  if (other)
    return fail(
      `The top folder has ${other}, but the task's name is ${file}. Capitals count.`,
      listing(ws)
    )
  const elsewhere = findByName(ws, file)
  if (elsewhere.length) {
    return fail(
      `${file} is at ${elsewhere[0]}, not in the top folder. A file made with > lands in the folder you are in, unless you give it a path.`,
      elsewhere.join('\n')
    )
  }
  return fail(`The top folder has no ${file} yet.`, listing(ws))
}

/** The lines `got` lacks and the lines it has too many of, compared with `want`, repeats counted. */
export const lineDiff = (got, want) => ({ missing: notIn(want, got), extra: notIn(got, want) })

/** The lines of `lines` that `other` does not have, each line of `other` used once. */
function notIn(lines, other) {
  const left = new Map()
  for (const l of other) left.set(l, (left.get(l) ?? 0) + 1)
  return lines.filter((l) => {
    const n = left.get(l) ?? 0
    if (n) left.set(l, n - 1)
    return n === 0
  })
}

/** Every file and folder under `dir`, hidden ones included, as forward-slash paths. */
export function entriesUnder(dir, prefix = '') {
  return names(join(dir, prefix)).flatMap((name) => {
    const rel = prefix ? `${prefix}/${name}` : name
    const k = kindOf(join(dir, rel))
    return k === 'dir' ? [{ rel, kind: k }, ...entriesUnder(dir, rel)] : k ? [{ rel, kind: k }] : []
  })
}

/** A long saved file for a check's output: its first lines and how many there are. */
export function preview(file, lines, shown = 6) {
  const head = lines.slice(0, shown).join('\n')
  return lines.length > shown
    ? `${file}, ${lines.length} lines:\n${head}\n...`
    : `${file}:\n${head}`
}

/** A line short enough to quote in a message. */
export const quoted = (line) => `"${line.length > 70 ? `${line.slice(0, 67)}...` : line}"`

/** A sentence to add to a message when files a result is built from changed since the start. */
export function changedNote(t, ...rels) {
  const gone = rels.filter((rel) => changed(t, rel))
  if (!gone.length) return ''
  const have = gone.length > 1 ? 'have' : 'has'
  return ` ${gone.join(' and ')} ${have} changed since the start, which may be why. Reset puts the starter files back as they were.`
}

/** The same detail with `note` added to its message. */
export const noted = (detail, note) =>
  note ? { ...detail, message: detail.message + note } : detail

/** A path's permission bits, or null when it cannot be looked at. */
export function modeOf(path) {
  try {
    return statSync(path).mode & 0o777
  } catch {
    return null
  }
}

/** The ten letters a long listing starts its line with, such as -rw-r--r--. */
export function modeLetters(path) {
  try {
    const s = statSync(path)
    const bits = [...'rwxrwxrwx'].map((c, i) => (s.mode & (0o400 >> i) ? c : '-')).join('')
    return (s.isDirectory() ? 'd' : '-') + bits
  } catch {
    return '?'
  }
}

/** A long-listing line for a check's output: the letters and the path. */
export const modeLine = (root, rel) => `${modeLetters(join(root, ...rel.split('/')))}  ${rel}`

const WHO = [
  ['the owner', 6],
  ['the group', 3],
  ['others', 0]
]

/** Which of the owner, the group and others have `letter` (r, w or x) in `mode`. */
export function whoHas(mode, letter) {
  const bit = { r: 4, w: 2, x: 1 }[letter]
  return WHO.filter(([, shift]) => mode & (bit << shift)).map(([who]) => who)
}

/** Words joined as a person writes a list: a, b and c. */
export const listWords = (words) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`

/**
 * A file the task wants in the top folder: its path, or the one detail that says why there is
 * nothing to judge yet.
 */
export function topFile(t, name, file) {
  const ws = t.workspace
  const fail = (message, output = listing(ws)) => ({ failed: check(name, false, message, output) })
  const k = kind(ws, file)
  if (k === 'dir') return fail(`${file} in the top folder is a folder. Check wants a file of that name.`)
  if (k !== 'file') {
    const other = names(ws).find((n) => n.toLowerCase() === file.toLowerCase())
    if (other) return fail(`The top folder has ${other}, but the task's name is ${file}. Capitals count.`)
    const elsewhere = findByName(ws, file)
    if (elsewhere.length) {
      return fail(
        `${file} is at ${elsewhere[0]}, not in the top folder.`,
        elsewhere.join('\n')
      )
    }
    return fail(`The top folder has no ${file} yet.`)
  }
  const path = join(ws, file)
  if (!whoHas(modeOf(path), 'r').includes('the owner')) {
    return fail(
      `Nobody may read ${file} now, you included: its owner has no r. chmod u+r ${file} gives it back.`,
      modeLine(ws, file)
    )
  }
  return { path, text: read(path) ?? '' }
}

/** The lines of a script or settings file have Windows line endings, which the shell reads as part of each command. */
export const crlfMessage = (file) =>
  `The lines of ${file} end in Windows line endings, an invisible \\r before each line break. The shell reads it as part of every command. Save the file again with plain line ends, as the lesson says.`

/** The small environment a learner's script runs in: the standard tools, the temp folders, and the copy as home. */
export const scriptEnv = (home, extra = {}) => ({
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: home,
  TMPDIR: tmpdir(),
  LC_ALL: 'C',
  ...extra
})

export const SCRIPT_TIMEOUT = 5000

/**
 * Runs a program with no input, a time limit and capped output, and never throws. It runs in a
 * process group of its own, so whatever it leaves running is stopped with it.
 */
export function runScript(file, args, { cwd, env, timeoutMs = SCRIPT_TIMEOUT }) {
  return new Promise((done) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let finished = false
    let child
    const stop = () => {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        // Already gone.
      }
    }
    const finish = (result) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (child?.pid) stop()
      done({ stdout, stderr, timedOut, ...result })
    }
    const timer = setTimeout(() => {
      timedOut = true
      stop()
    }, timeoutMs)
    try {
      child = spawn(file, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
    } catch (error) {
      finish({ code: null, error: error?.code ?? String(error) })
      return
    }
    child.stdout.on('data', (d) => {
      if (stdout.length < MAX_SCRIPT_OUTPUT) stdout += d
    })
    child.stderr.on('data', (d) => {
      if (stderr.length < MAX_SCRIPT_OUTPUT) stderr += d
    })
    child.on('error', (error) => finish({ code: null, error: error.code ?? String(error) }))
    child.on('close', (code) => finish({ code }))
  })
}

const MAX_SCRIPT_OUTPUT = 8000

/** Gives the owner every right on every folder under `dir`, so the copy can be removed afterwards. */
function openUp(dir) {
  try {
    if (!lstatSync(dir).isDirectory()) return
    chmodSync(dir, 0o700 | (statSync(dir).mode & 0o777))
    for (const name of readdirSync(dir)) openUp(join(dir, name))
  } catch {
    // What cannot be opened is left for the removal to report.
  }
}

/**
 * Runs `fn` on a fresh copy of the workspace. When the copy cannot be made, it returns the one
 * detail that says why instead.
 */
export async function withSandbox(t, name, fn) {
  let dir
  try {
    dir = await t.sandbox()
  } catch (error) {
    const where = error?.path
      ? relative(t.workspace, error.path).split(sep).join('/')
      : 'a file in the top folder'
    const message =
      error?.code === 'EACCES'
        ? `Check copies the top folder before it runs anything, and it could not read ${where}. A file needs its owner's r, and a folder its owner's r and x: chmod u+r gives a file its r back, and chmod u+rwx a folder.`
        : `Check could not copy the top folder: ${error?.message ?? error}`
    return [check(name, false, message, '')]
  }
  try {
    return await fn(dir)
  } finally {
    openUp(dir)
  }
}

/** The lines a program printed, each trimmed, empty ones left out. */
export const printed = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
