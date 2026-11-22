// Task: Check a sign-in the same way every time
//
// checkSignIn(staff, email, password) returns the staff member as { id, name, email, role } when
// the password is theirs, and null otherwise. A wrong password and an email nobody has give the
// same answer, and take as long: both check a password against a hash.
import { hashPassword, verifyPassword } from './passwords.js'
import { publicStaff } from './staff.js'

export function checkSignIn(staff, email, password) {
  throw new Error('Not implemented')
}
