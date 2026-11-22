// Written in the last issue.
//
// signedIn(req, res, next) is a middleware. GET and HEAD requests go on to the next handler, for
// everyone. Any other request goes on only when req.staff is set; otherwise it answers 401 with
// { error: { code: 'not_signed_in', message } } and the route never runs.
export function signedIn(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.staff) return next()
  res.status(401).json({ error: { code: 'not_signed_in', message: 'Sign in to change workshops' } })
}
