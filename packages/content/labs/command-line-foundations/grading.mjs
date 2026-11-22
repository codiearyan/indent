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
