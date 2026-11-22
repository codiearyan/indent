// Task: Know who sent each request
//
// - mount readSession(staff, sessions) from src/middleware/readSession.js before every route, so
//   req.staff is set for each request that carries a session cookie
// Changes to workshops still need the one shared staff key.
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
