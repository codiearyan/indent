// Task: Save staff without their password
//
// addStaff(staff, person) takes { name, email, role, password }. It saves the person in the staff
// store with a passwordHash made by hashPassword() in place of the password, and returns the
// saved member without the hash: { id, name, email, role }.
import { hashPassword } from './passwords.js'

export function addStaff(staff, { password, ...person }) {
  return publicStaff(staff.add({ ...person, passwordHash: hashPassword(password) }))
}

export function publicStaff({ passwordHash, ...member }) {
  return member
}
