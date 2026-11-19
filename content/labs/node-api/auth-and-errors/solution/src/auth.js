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
  const match = /^Bearer +(\S+)$/i.exec(req.headers.authorization ?? '')
  const role = match ? tokens.get(match[1]) : undefined
  if (!role) {
    res.setHeader('www-authenticate', 'Bearer')
    throw new HttpError(401, 'unauthorized', 'Send a valid token as Authorization: Bearer <token>')
  }
  if (role !== 'staff') {
    throw new HttpError(403, 'forbidden', 'This token can read the fleet but not change it')
  }
  return role
}
