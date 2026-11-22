// Task: Refuse a session that has ended
//
// readSession(staff, sessions, now) returns a middleware that sets req.staff from the request's
// session cookie, as in the last issue. A session whose expiresAt has come (now() is at or past
// it) no longer counts: it is removed from the store and req.staff stays unset.
// sessionToken(req) gives the value of the request's session cookie.
import { publicStaff } from '../staff.js'

export function readSession(staff, sessions, now) {
  return (req, res, next) => {
    const token = sessionToken(req)
    let session = token && sessions.get(token)
    if (session && session.expiresAt <= now()) {
      sessions.remove(token)
      session = undefined
    }
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
