// What the issue graders share. They read the learner's workspace as it is on disk, never a copy:
// the work is the state the learner's commands left behind.
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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
