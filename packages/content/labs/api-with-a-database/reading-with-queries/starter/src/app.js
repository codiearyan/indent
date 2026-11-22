// createApp({ db, staffKey }) builds the API on a database. Without one it opens the studio's
// file, data/kilnworth.db, which openDatabase makes and fills the first time.
import express from 'express'
import { handleErrors } from './middleware/errors.js'
import { staffOnly } from './middleware/staffOnly.js'
import { workshopsRouter } from './routes/workshops.js'
import { openDatabase } from './db.js'
import { createStore } from './store.js'

export function createApp({
  db = openDatabase('data/kilnworth.db'),
  staffKey = process.env.STAFF_KEY ?? 'kilnworth-staff'
} = {}) {
  const store = createStore(db)
  const app = express()
  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/workshops', staffOnly(staffKey), workshopsRouter(store))

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  app.use(handleErrors)

  return app
}
