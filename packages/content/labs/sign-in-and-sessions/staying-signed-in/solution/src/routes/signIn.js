// Task: Start a session at sign-in
//
// signInRouter(staff, sessions) returns a router with POST /sign-in, written in the last issue,
// and GET /me, written for you. When a sign-in works, POST /sign-in also:
// - makes a token with newToken() and saves { staffId } under it in the session store
// - sends it in a cookie named session that scripts on the page cannot read, with SameSite set
//   to Lax and the path /
// - keeps the token out of the body and out of the log
import express from 'express'
import { checkSignIn } from '../signIn.js'
import { newToken } from '../tokens.js'

export function signInRouter(staff, sessions) {
  const router = express.Router()

  router.post('/sign-in', (req, res) => {
    const { email, password } = req.body ?? {}
    if (!filled(email) || !filled(password)) {
      return res.status(400).json({
        error: { code: 'bad_sign_in', message: 'Send an email and a password' }
      })
    }
    const member = checkSignIn(staff, email, password)
    if (!member) {
      console.log(`sign-in refused for ${email}`)
      return res.status(401).json({
        error: { code: 'wrong_sign_in', message: 'That email and password do not match' }
      })
    }
    const token = newToken()
    sessions.save(token, { staffId: member.id })
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' })
    console.log(`signed in ${email}`)
    res.json({ staff: member })
  })

  router.get('/me', (req, res) => {
    if (!req.staff) {
      return res.status(401).json({ error: { code: 'not_signed_in', message: 'Sign in first' } })
    }
    res.json({ staff: req.staff })
  })

  return router
}

const filled = (value) => typeof value === 'string' && value !== ''
