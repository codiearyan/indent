// Task: Make a token nobody can guess
//
// newToken() returns a new session token each time: at least 32 random bytes from node:crypto,
// written as base64url or hex text, so it can go in a cookie as it is.
import { randomBytes } from 'node:crypto'

export function newToken() {
  throw new Error('Not implemented')
}
