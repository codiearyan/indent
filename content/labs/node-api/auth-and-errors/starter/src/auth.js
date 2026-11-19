// Task: Lock the write routes
//
// requireStaff(req, res, tokens) checks the Authorization header of a request that changes data.
// `tokens` is a Map from token to role.
// - no header, a header that is not 'Bearer <token>', or a token not in the map:
//   set the header 'www-authenticate: Bearer' on res and throw
//   new HttpError(401, 'unauthorized', message)
// - a known token whose role is not 'staff': throw new HttpError(403, 'forbidden', message)
// - otherwise return the role
// The word Bearer may be written in any case.
import { HttpError } from './errors.js'

export function requireStaff(req, res, tokens) {
  throw new Error('Not implemented')
}
