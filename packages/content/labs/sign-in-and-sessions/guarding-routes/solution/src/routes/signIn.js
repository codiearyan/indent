// Written in the last two issues. signInRouter(staff, sessions) has POST /sign-in, which checks
// the password, saves a session and sends its token in an HttpOnly cookie, and GET /me, which
// answers with req.staff.
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
