// Tasks: Ask for a sign-in instead of the key, Show the owner who has an account
//
// - put signedIn from src/middleware/signedIn.js in front of the workshops router, in place of
//   staffOnly(staffKey), and stop using the staff key
// - mount staffRouter(staff) from src/routes/staff.js at /staff, behind allow('owner')
import express from 'express'
import { handleErrors } from './middleware/errors.js'
import { readSession } from './middleware/readSession.js'
import { staffOnly } from './middleware/staffOnly.js'
import { signInRouter } from './routes/signIn.js'
import { workshopsRouter } from './routes/workshops.js'
import { createSessionStore } from './sessionStore.js'
import { createStore } from './store.js'
import { createTeam } from './team.js'
import { workshops } from './workshops.js'

export function createApp({
  store = createStore(workshops),
  staff = createTeam(),
  sessions = createSessionStore(),
  staffKey = process.env.STAFF_KEY ?? 'kilnworth-staff'
} = {}) {
  const app = express()
  app.use(express.json())
  app.use(readSession(staff, sessions))

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.use(signInRouter(staff, sessions))
  app.use('/workshops', staffOnly(staffKey), workshopsRouter(store))

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  app.use(handleErrors)

  return app
}
