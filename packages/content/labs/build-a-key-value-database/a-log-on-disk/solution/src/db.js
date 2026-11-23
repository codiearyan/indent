// Ashgrove's own database. Plain JavaScript on Node's own file functions, and nothing else.
//
// Task 1: Add each change to the log (open, set, close, encode)
// Task 2: Replay the log when the store opens (open, decode)
// Task 3: Make a delete a record too (delete, encode, decode)
//
// The log is the file store.log in the folder open(dir) was given. Each change is one line:
//   set<TAB>key<TAB>value<LF>     after set(key, value)
//   delete<TAB>key<LF>            after delete(key)
// In this issue keys and values hold no tab and no line break. The next issue lifts that.
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

function mustBeText(what, value) {
  if (typeof value !== 'string') throw new TypeError(`${what} must be text, not ${typeof value}`)
}

export function encode(change) {
  if (change.op === 'delete') return `delete\t${change.key}\n`
  return `set\t${change.key}\t${change.value}\n`
}

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
