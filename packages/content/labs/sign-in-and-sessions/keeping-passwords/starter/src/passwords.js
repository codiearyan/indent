// Tasks: Hash a password with a salt, Check a password against its hash
//
// hashPassword(password) returns '<salt>:<hash>', both written as hex:
// - salt: 16 random bytes, new for every call
// - hash: 64 bytes of scrypt of the password, given the salt as its hex text
//
// verifyPassword(password, stored) returns true when password is the one stored was made from,
// and false otherwise. It compares the two hashes in constant time, and returns false for a
// stored value that is not a salt and a hash.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password) {
  throw new Error('Not implemented')
}

export function verifyPassword(password, stored) {
  throw new Error('Not implemented')
}
