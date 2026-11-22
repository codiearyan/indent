// Copied into the sandbox as .grader/drive.mjs. Signs in with the learner's signIn() and gathers
// every secret each attempt touched, so the check can look for them in what came out.
import { hashPassword, openDb } from '../src/db.js'
import { signIn } from '../src/signIn.js'

export function attempts(forms) {
  const db = openDb()
  const lookup = db.prepare('SELECT id, salt, password_hash FROM customers WHERE email = ?')
  const session = db.prepare('SELECT customer_id FROM sessions WHERE token = ?')
  return forms.map((form) => {
    const log = []
    const customer = lookup.get(form.email)
    const hashes = customer
      ? [customer.password_hash, hashPassword(form.password, customer.salt)]
      : []
    try {
      const result = signIn(db, (line) => log.push(String(line)), { ...form })
      const saved =
        typeof result?.token === 'string' ? (session.get(result.token)?.customer_id ?? null) : null
      return { result, log, hashes, saved, customerId: customer?.id ?? null }
    } catch (err) {
      return { error: `${err.name}: ${err.message}`, log, hashes }
    }
  })
}
