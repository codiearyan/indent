// Written in the last issue.
//
// hashPassword(password) returns '<salt>:<hash>', both written as hex:
// - salt: 16 random bytes, new for every call
// - hash: 64 bytes of scrypt of the password, given the salt as its hex text
//
// verifyPassword(password, stored) returns true when password is the one stored was made from,
// and false otherwise. It compares the two hashes in constant time, and returns false for a
// stored value that is not a salt and a hash.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const HASH_BYTES = 64

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, HASH_BYTES).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, HASH_BYTES)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
