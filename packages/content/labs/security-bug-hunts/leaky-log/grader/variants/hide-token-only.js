import { randomBytes } from 'node:crypto'
import { hashPassword } from './db.js'

export function signIn(db, log, form) {
  log(`sign in attempt ${JSON.stringify(form)}`)
  const customer = db
    .prepare('SELECT id, salt, password_hash FROM customers WHERE email = ?')
    .get(form.email)
  if (!customer || hashPassword(form.password, customer.salt) !== customer.password_hash) {
    return { ok: false, message: 'Email or password is wrong.' }
  }
  const token = randomBytes(16).toString('hex')
  db.prepare('INSERT INTO sessions (token, customer_id) VALUES (?, ?)').run(token, customer.id)
  log(`signed in customer ${customer.id}`)
  return { ok: true, token }
}
