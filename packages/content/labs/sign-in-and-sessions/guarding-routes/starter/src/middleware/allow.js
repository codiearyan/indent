// Task: Let only the owner remove workshops
//
// allow(...roles) returns a middleware that lets a request go on only when req.staff is set and
// its role is one of roles:
// - no req.staff: 401 with { error: { code: 'not_signed_in', message } }
// - signed in with another role: 403 with { error: { code: 'forbidden', message } }
export function allow(...roles) {
  throw new Error('Not implemented')
}
