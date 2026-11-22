// Task 2: keep secrets out of the log and the sign in page (ticket LL-26).
//
// signIn(db, log, form) checks form = { email, password }. When they match a customer it saves a
// session and returns { ok: true, token }; otherwise it returns { ok: false, message } with the
// message for the sign in page. log(line) writes one line to the portal's log, which the whole
// team and the contractors who help with the site can read.
// Keep the function name, its arguments and the shapes it returns.

import { randomBytes } from 'node:crypto'
import { hashPassword } from './db.js'

export function signIn(db, log, form) {
  const customer = db
    .prepare('SELECT id, salt, password_hash FROM customers WHERE email = ?')
    .get(form.email)
  if (!customer || hashPassword(form.password, customer.salt) !== customer.password_hash) {
    log(`sign in failed for ${form.email}`)
    return { ok: false, message: 'Email or password is wrong.' }
  }
  const token = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO sessions (token, customer_id) VALUES (?, ?)').run(token, customer.id)
  log(`signed in ${form.email}`)
  return { ok: true, token }
}
