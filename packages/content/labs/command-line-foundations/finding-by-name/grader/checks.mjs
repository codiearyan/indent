import { isAbsolute, join, relative, sep } from 'node:path'
import {
  check,
  entriesUnder,
  isDir,
  kind,
  names,
  noted,
  preview,
  quoted,
  real,
  saved
} from '../../grading.mjs'

const STICKS = 'old-sticks'
const base = (rel) => rel.split('/').pop()
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** A saved line as a path from the top folder, or null when it leads nowhere from there. */
function fromTop(ws, line) {
  const path = real(isAbsolute(line) ? line : join(ws, line))
  const top = real(ws)
  if (!path || path === top) return null
  const rel = relative(top, path)
  return rel.startsWith('..') ? null : rel.split(sep).join('/')
}

/**
 * Reads the paths saved in `file` and compares them with what is in old-sticks now. `wanted` picks
 * the entries the search should find; `explain` names the cause of extra or missing paths, or
 * returns null for the plain message.
 */
function judge(t, name, file, wanted, explain) {
  const ws = t.workspace
  const got = saved(t, name, file)
  if (got.failed) {
    const empty = kind(ws, file) === 'file'
    return [
      noted(
        got.failed,
        empty
          ? ' A pattern without quotes may have been changed by the shell before the search began.'
          : ''
      )
    ]
  }
  const output = preview(file, got.lines, 8)
  const fail = (message) => [check(name, false, message, output)]
  if (!isDir(ws, STICKS))
    return fail(`${STICKS} is gone from the top folder. Reset brings it back.`)
  const rels = []
  for (const line of got.lines.filter(Boolean)) {
    const rel = fromTop(ws, line)
    if (rel !== null) {
      rels.push(rel)
      continue
    }
    if (fromTop(join(ws, STICKS), line) !== null) {
      return fail(
        `Paths such as ${quoted(line)} start inside ${STICKS}, so they do not lead anywhere from the top folder. Run the search from the top folder, so every path starts with ${STICKS}.`
      )
    }
    return fail(
      `${quoted(line)} is not a path that leads to a file or folder from the top folder. Save the paths the search prints, run from the top folder.`
    )
  }
  const outside = rels.filter((rel) => rel !== STICKS && !rel.startsWith(`${STICKS}/`))
  if (outside.length) {
    return fail(
      `${file} also lists ${outside[0]}, which is outside ${STICKS}. Search only ${STICKS}.`
    )
  }
  const found = new Set(rels)
  const want = entriesUnder(ws, STICKS).filter(wanted)
  const extra = [...found].filter((rel) => !want.some((e) => e.rel === rel))
  const missing = want.filter((e) => !found.has(e.rel))
  if (!extra.length && !missing.length) return [check(name, true, '', output)]
  return fail(
    explain({ extra, missing, rels, ws }) ??
      (extra.length
        ? `${file} lists ${extra[0]}, which the task does not ask for.`
        : `${plural(missing.length, 'path')} ${missing.length === 1 ? 'is' : 'are'} missing from ${file}.`)
  )
}

export const checks = {
  async drawings(t) {
    const name = 'drawings.txt lists every .svg file in old-sticks'
    return judge(
      t,
      name,
      'drawings.txt',
      (e) => e.rel.endsWith('.svg'),
      ({ extra, missing, rels, ws }) => {
        const one = new Set(rels.map(base))
        if (missing.length && one.size === 1 && names(ws).includes([...one][0])) {
          const n = [...one][0]
          return `Every line is a file called ${n}, like the ${n} in the top folder. The shell put that name in place of the pattern before the search started.`
        }
        if (extra.length) return `${extra[0]} is not a .svg file.`
        return `${plural(missing.length, 'drawing')} ${missing.length === 1 ? 'is' : 'are'} missing from drawings.txt. Some are several folders deep.`
      }
    )
  },

  async invoices(t) {
    const name = 'invoices.txt lists every file with invoice in its name'
    const has = (rel) => base(rel).toLowerCase().includes('invoice')
    return judge(
      t,
      name,
      'invoices.txt',
      (e) => has(e.rel),
      ({ extra, missing }) => {
        if (extra.length) return `${base(extra[0])} does not have invoice in its name.`
        const n = `${plural(missing.length, 'file')} ${missing.length === 1 ? 'is' : 'are'} missing`
        if (missing.every((e) => !base(e.rel).includes('invoice'))) {
          return `${n}. ${missing.length === 1 ? 'Its name writes' : 'Their names write'} invoice with capitals.`
        }
        if (missing.every((e) => !base(e.rel).toLowerCase().startsWith('invoice'))) {
          return `${n}. invoice can be anywhere in a name, not only at its start.`
        }
        return `${n}.`
      }
    )
  },

  async proofs(t) {
    const name = 'proof-folders.txt lists every folder called proofs'
    return judge(
      t,
      name,
      'proof-folders.txt',
      (e) => e.kind === 'dir' && base(e.rel) === 'proofs',
      ({ extra, ws }) => {
        if (!extra.length) return null
        const file = extra.find((rel) => base(rel) === 'proofs' && !isDir(ws, ...rel.split('/')))
        if (file)
          return `proof-folders.txt also lists ${file}, which is one of Sol's notes: a file, not a folder.`
        return `${extra[0]} is not a folder called proofs.`
      }
    )
  }
}
