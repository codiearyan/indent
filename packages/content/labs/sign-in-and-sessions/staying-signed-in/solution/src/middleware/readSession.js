// Task: Know who sent each request
//
// readSession(staff, sessions) returns a middleware that reads the session cookie of a request.
// When the cookie holds a token the session store knows, and the staff member of that session
// still exists, it sets req.staff to { id, name, email, role }. Otherwise it leaves req.staff
// unset. Either way it calls next(), so reads keep working for everyone.
import { publicStaff } from '../staff.js'

export function readSession(staff, sessions) {
  return (req, res, next) => {
    const token = sessionToken(req)
    const session = token && sessions.get(token)
    const member = session && staff.get(session.staffId)
    if (member) req.staff = publicStaff(member)
    next()
  }
}

/** The value of the request's session cookie, or undefined when it has none. */
export function sessionToken(req) {
  for (const pair of (req.get('cookie') ?? '').split(';')) {
    const [name, ...value] = pair.trim().split('=')
    if (name === 'session') return value.join('=') || undefined
  }
  return undefined
}
