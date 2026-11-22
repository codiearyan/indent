// The workshops API from the Express project. Changes still need the one shared staff key.
import express from 'express'
import { handleErrors } from './middleware/errors.js'
import { staffOnly } from './middleware/staffOnly.js'
import { workshopsRouter } from './routes/workshops.js'
import { createStore } from './store.js'
import { workshops } from './workshops.js'

export function createApp({
  store = createStore(workshops),
  staffKey = process.env.STAFF_KEY ?? 'kilnworth-staff'
} = {}) {
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
