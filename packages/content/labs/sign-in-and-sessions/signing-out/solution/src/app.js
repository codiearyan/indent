// The workshops API. Every request is read for a session; changes need a sign-in, removing a
// workshop and the staff list need the owner. now() is the clock: the checks pass one of their own.
import express from 'express'
import { allow } from './middleware/allow.js'
import { handleErrors } from './middleware/errors.js'
import { readSession } from './middleware/readSession.js'
import { signedIn } from './middleware/signedIn.js'
import { signInRouter } from './routes/signIn.js'
import { staffRouter } from './routes/staff.js'
import { workshopsRouter } from './routes/workshops.js'
import { createSessionStore } from './sessionStore.js'
import { createStore } from './store.js'
import { createTeam } from './team.js'
import { workshops } from './workshops.js'

export function createApp({
  store = createStore(workshops),
  staff = createTeam(),
  sessions = createSessionStore(),
  now = Date.now
} = {}) {
  const app = express()
  app.use(express.json())
  app.use(readSession(staff, sessions, now))

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.use(signInRouter(staff, sessions, now))
  app.use('/workshops', signedIn, workshopsRouter(store))
  app.use('/staff', allow('owner'), staffRouter(staff))

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  app.use(handleErrors)

  return app
}
