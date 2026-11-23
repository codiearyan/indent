// Ashgrove's own database. Plain JavaScript on Node's own file functions, and nothing else.
//
// Task 1: Write one record per key (compact)
// Task 2: Swap the new log in, in one step (compact)
// Task 3: Keep going after compaction (compact, set, delete)
//
// The log is the file store.log in the folder open(dir) was given, one record per change, in
// order, and it only grows. compact() writes the store's keys and values again as a new, short
// log in store.log.new beside it, then puts that file in store.log's place.
import { appendFile, mkdir, readFile, rename, truncate, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

function mustBeText(what, value) {
  if (typeof value !== 'string') throw new TypeError(`${what} must be text, not ${typeof value}`)
}

// A record is a header line with the lengths, then the key and the value as they are, then a
// line break: `set 4 6\npaperlinen\n` or `delete 5\npaper\n`. Lengths count characters.
export function encode(change) {
  if (change.op === 'delete') return `delete ${change.key.length}\n${change.key}\n`
  return `set ${change.key.length} ${change.value.length}\n${change.key}${change.value}\n`
}

// One whole record starting at `at`, or undefined when the text ends before the record does.
function readRecord(text, at) {
  const headerEnd = text.indexOf('\n', at)
  if (headerEnd === -1) return undefined
  const [op, ...lengths] = text.slice(at, headerEnd).split(' ')
  const [keyLength, valueLength] = lengths.map(Number)
  const start = headerEnd + 1
  if (op === 'delete' && Number.isInteger(keyLength)) {
    const stop = start + keyLength
    if (text[stop] !== '\n') return undefined
    return { change: { op, key: text.slice(start, stop) }, next: stop + 1 }
  }
  if (op === 'set' && Number.isInteger(keyLength) && Number.isInteger(valueLength)) {
    const stop = start + keyLength + valueLength
    if (text[stop] !== '\n') return undefined
    const change = { op, key: text.slice(start, start + keyLength), value: text.slice(start + keyLength, stop) }
    return { change, next: stop + 1 }
  }
  return undefined
}

// The changes of every whole record, and where the last whole record ends.
export function decode(text) {
  const changes = []
  let end = 0
  for (let record = readRecord(text, 0); record; record = readRecord(text, end)) {
    changes.push(record.change)
    end = record.next
  }
  return { changes, end }
}

async function readLog(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
  }
}

// open(dir) returns a promise of the store kept in the folder dir. It replays every whole record
// of store.log, and cuts off a last record that a stop left cut short.
// Tasks 1 to 3: store.compact() writes one record for each key the store holds, as set writes
// it, into store.log.new, and only once that file is whole renames it onto store.log. Afterwards
// the store goes on as before, and later changes land in the new log.
export async function open(dir) {
  await mkdir(dir, { recursive: true })
  const log = join(dir, 'store.log')
  const text = await readLog(log)
  const { changes, end } = decode(text)
  // A stop halfway through a write leaves a broken record at the end: cut it off, in bytes.
  if (end < text.length) await truncate(log, Buffer.byteLength(text.slice(0, end)))
  const values = new Map()
  for (const change of changes) {
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
    async compact() {
      throw new Error('Not implemented')
    },
    // Every set and delete waits for its own write, so nothing is left to wait for here.
    async close() {}
  }
}
