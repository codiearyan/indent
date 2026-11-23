// Ashgrove's own database. Plain JavaScript on Node's own file functions, and nothing else.
//
// Task 1: Keep any text in a record (encode, decode)
// Task 2: Leave out a record cut short (decode, open)
// Task 3: Carry on after a cut (open)
//
// The log is the file store.log in the folder open(dir) was given, one record per change, in
// order. Today a record is one line with tabs between its parts, which breaks as soon as a key or
// a value holds a tab or a line break. The new format is yours, length first or escaping, as long
// as a record holds any text and a whole record can be told from one cut short.
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

function mustBeText(what, value) {
  if (typeof value !== 'string') throw new TypeError(`${what} must be text, not ${typeof value}`)
}

// Task 1
// encode(change) returns the record for one change, { op: 'set', key, value } or
// { op: 'delete', key }, in your format.
export function encode(change) {
  if (change.op === 'delete') return `delete\t${change.key}\n`
  return `set\t${change.key}\t${change.value}\n`
}

// Tasks 1 and 2
// decode(text) returns the changes the whole records of a log hold, in order. Task 2: a last
// record cut short is left out, and it helps open to know where the whole records end, so
// decode can return { changes, end } once you get there.
export function decode(text) {
  return text
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [op, key, value] = line.split('\t')
      return op === 'delete' ? { op, key } : { op, key, value }
    })
}

async function readLog(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}

// Tasks 2 and 3
// open(dir) returns a promise of the store kept in the folder dir. It replays every whole record
// and leaves out a last record cut short. Task 3: it also cuts that broken end off store.log
// before anything else is written, so the next record starts clean.
export async function open(dir) {
  await mkdir(dir, { recursive: true })
  const log = join(dir, 'store.log')
  const values = new Map()
  for (const change of decode(await readLog(log))) {
    if (change.op === 'delete') values.delete(change.key)
    else values.set(change.key, change.value)
  }
  return {
    get(key) {
      mustBeText('A key', key)
      return values.get(key)
    },
    async set(key, value) {
      mustBeText('A key', key)
      mustBeText('A value', value)
      await appendFile(log, encode({ op: 'set', key, value }))
      values.set(key, value)
    },
    has(key) {
      mustBeText('A key', key)
      return values.has(key)
    },
    async delete(key) {
      mustBeText('A key', key)
      if (!values.has(key)) return
      await appendFile(log, encode({ op: 'delete', key }))
      values.delete(key)
    },
    // Every set and delete waits for its own write, so nothing is left to wait for here.
    async close() {}
  }
}
