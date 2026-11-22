// Written in the last issue. addStaff(staff, person) saves a person with a passwordHash in place
// of their password and returns { id, name, email, role }. publicStaff(member) leaves out the hash.
import { hashPassword } from './passwords.js'

export function addStaff(staff, { password, ...person }) {
  return publicStaff(staff.add({ ...person, passwordHash: hashPassword(password) }))
}

export function publicStaff({ passwordHash, ...member }) {
  return member
}
