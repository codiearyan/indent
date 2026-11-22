// Task: Ask for a sign-in instead of the key
//
// signedIn(req, res, next) is a middleware. GET and HEAD requests go on to the next handler, for
// everyone. Any other request goes on only when req.staff is set; otherwise it answers 401 with
// { error: { code: 'not_signed_in', message } } and the route never runs.
export function signedIn(req, res, next) {
  throw new Error('Not implemented')
}
