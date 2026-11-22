// Tasks: Create the app and its health check, List the workshops, Answer JSON for every other path
//
// createApp() builds a new Express app and returns it without listening:
// - GET /health answers 200 with { status: 'ok' }
// - GET /workshops answers 200 with every workshop from store.list()
// - any other request answers 404 with { error: { code: 'not_found', message } }
// server.js and try.js call listen() on what you return.
import express from 'express'
import { createStore } from './store.js'
import { workshops } from './workshops.js'

export function createApp({ store = createStore(workshops) } = {}) {
  const app = express()

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/workshops', (req, res) => {
    res.json(store.list())
  })

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  return app
}
