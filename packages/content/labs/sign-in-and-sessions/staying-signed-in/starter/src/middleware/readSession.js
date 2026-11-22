// Task: Know who sent each request
//
// readSession(staff, sessions) returns a middleware that reads the session cookie of a request.
// When the cookie holds a token the session store knows, and the staff member of that session
// still exists, it sets req.staff to { id, name, email, role }. Otherwise it leaves req.staff
// unset. Either way it calls next(), so reads keep working for everyone.
import { publicStaff } from '../staff.js'

export function readSession(staff, sessions) {
  throw new Error('Not implemented')
}
