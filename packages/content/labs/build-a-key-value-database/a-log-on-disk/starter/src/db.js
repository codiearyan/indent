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

// Tasks 1 and 3
// encode(change) returns the line of the log for one change, line break included.
// A change is { op: 'set', key, value } or { op: 'delete', key }.
export function encode(change) {
  throw new Error('Not implemented')
}

// Tasks 2 and 3
// decode(text) returns the changes the lines of a log hold, in order, as objects like encode's.
export function decode(text) {
  throw new Error('Not implemented')
}

// open(dir) returns a promise of a store kept in the folder dir.
// Task 1: open makes the folder when it is missing. set() adds its record to the end of
// store.log, and its promise resolves once the record is there. close() resolves once every
// change is in the file.
// Task 2: when store.log is there, open replays its records, in order, into the store.
// Task 3: delete() adds its record too, unless the store does not hold the key.
export async function open(dir) {
  const values = new Map()
  return {
    get(key) {
      mustBeText('A key', key)
      return values.get(key)
    },
    set(key, value) {
      mustBeText('A key', key)
      mustBeText('A value', value)
      values.set(key, value)
    },
    has(key) {
      mustBeText('A key', key)
      return values.has(key)
    },
    delete(key) {
      mustBeText('A key', key)
      values.delete(key)
    },
    async close() {
      throw new Error('Not implemented')
    }
  }
}
