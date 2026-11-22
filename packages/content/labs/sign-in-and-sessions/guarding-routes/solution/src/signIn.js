// Written in the last issue.
//
// checkSignIn(staff, email, password) returns the staff member as { id, name, email, role } when
// the password is theirs, and null otherwise. A wrong password and an email nobody has give the
// same answer, and take as long: both check a password against a hash.
import { hashPassword, verifyPassword } from './passwords.js'
import { publicStaff } from './staff.js'

// Checked when nobody has the email, so that answer takes as long as a wrong password.
const STAND_IN = hashPassword('nobody signs in with this')

export function checkSignIn(staff, email, password) {
  const member = staff.findByEmail(email)
  const matches = verifyPassword(password, member ? member.passwordHash : STAND_IN)
  return member && matches ? publicStaff(member) : null
}
