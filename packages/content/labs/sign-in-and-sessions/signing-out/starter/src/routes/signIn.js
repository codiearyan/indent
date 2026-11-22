// Tasks: Sign out, Give each session an end
//
// signInRouter(staff, sessions, now) has POST /sign-in and GET /me from the last issues. Add:
// - POST /sign-out: removes the session of the request's cookie from the store, tells the browser
//   to drop the session cookie, and answers 204, also when the request had no session
// - at sign-in, an end for the session: save expiresAt, the time in milliseconds now() +
//   SESSION_MS, with the session, and make the cookie last as long
import express from 'express'
import { sessionToken } from '../middleware/readSession.js'
import { checkSignIn } from '../signIn.js'
import { newToken } from '../tokens.js'

export const SESSION_MS = 8 * 60 * 60 * 1000

export function signInRouter(staff, sessions, now) {
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
