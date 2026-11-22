// Tasks: Add the sign-in route, Log each attempt without its secrets
//
// signInRouter(staff) returns a router with POST /sign-in. The body is { email, password }:
// - both must be text that is not empty, or it answers 400 with code 'bad_sign_in'
// - the right password answers 200 with { staff: { id, name, email, role } }
// - anything else answers 401 with code 'wrong_sign_in', the same answer for a wrong password
//   and for an email nobody has
// - every attempt logs one line with its email and how it ended, and no password or hash ever
//   reaches a log or an answer
import express from 'express'
import { checkSignIn } from '../signIn.js'

export function signInRouter(staff) {
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
    console.log(`signed in ${email}`)
    res.json({ staff: member })
  })

  return router
}

const filled = (value) => typeof value === 'string' && value !== ''
