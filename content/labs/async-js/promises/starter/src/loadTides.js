// Task: Wrap the tide reader in a promise
//
// loadTides(port, read) calls read(port, callback) once and returns a promise.
// - when read calls back with (error), the promise rejects with that same error
// - when read calls back with (null, table), the promise resolves with the table
// read defaults to readTideTable from services.js. The check passes its own fake read.
import { readTideTable } from './services.js'

export function loadTides(port, read = readTideTable) {
  throw new Error('Not implemented')
}
