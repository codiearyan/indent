// Task: Let only the owner remove workshops
//
// allow(...roles) returns a middleware that lets a request go on only when req.staff is set and
// its role is one of roles:
// - no req.staff: 401 with { error: { code: 'not_signed_in', message } }
// - signed in with another role: 403 with { error: { code: 'forbidden', message } }
export function allow(...roles) {
  return (req, res, next) => {
    if (!req.staff) {
      return res.status(401).json({ error: { code: 'not_signed_in', message: 'Sign in first' } })
    }
    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({
        error: { code: 'forbidden', message: 'Your role cannot do this' }
      })
    }
    next()
  }
}
