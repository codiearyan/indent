// Task 1: catch a secret in the log or on the sign in page (ticket AP-26).
//
// Sign in once through the original signIn() with a fresh openDb(), collecting every log line in
// an array. Use a customer from seed.js, with the right password or a wrong one.
// Return { form, log, result }:
// - form: the { email, password } you signed in with
// - log: every line signIn() logged, in order
// - result: exactly what signIn() returned
// `node src/demo.js` prints what this function returns.
import { openDb } from './db.js'
import { signIn } from './signIn.js'

export function reproduceLeak() {
  const form = { email: 'cosmo@example.com', password: 'tin-lantern-5' }
  const log = []
  const result = signIn(openDb(), (line) => log.push(line), form)
  return { form, log, result }
}
