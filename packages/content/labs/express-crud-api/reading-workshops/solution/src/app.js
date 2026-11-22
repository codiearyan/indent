// Tasks: Read one workshop by id, Filter the list by day, Filter it by price
//
// - GET /workshops/:id answers 200 with that workshop. Ids in the store are numbers. An id the
//   store does not have, or one that is not a number, answers 404 with
//   { error: { code: 'not_found', message } }
// - GET /workshops?day=thu keeps only the workshops on that day
// - GET /workshops?maxPriceCents=4000 keeps only those that cost at most that much, and a value
//   that is not a number answers 400 with { error: { code: 'bad_query', message } }
// Without a filter GET /workshops lists everything, and both filters together keep the workshops
// that match both.
import express from 'express'
import { createStore } from './store.js'
import { workshops } from './workshops.js'

export function createApp({ store = createStore(workshops) } = {}) {
  const app = express()

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/workshops', (req, res) => {
    const { day, maxPriceCents } = req.query
    const maxPrice = maxPriceCents === undefined ? undefined : Number(maxPriceCents)
    if (Number.isNaN(maxPrice)) {
      return res.status(400).json({
        error: { code: 'bad_query', message: 'maxPriceCents should be a number of cents' }
      })
    }
    const found = store
      .list()
      .filter((workshop) => day === undefined || workshop.day === day)
      .filter((workshop) => maxPrice === undefined || workshop.priceCents <= maxPrice)
    res.json(found)
  })

  app.get('/workshops/:id', (req, res) => {
    const workshop = store.get(Number(req.params.id))
    if (!workshop) {
      return res.status(404).json({
        error: { code: 'not_found', message: `No workshop has the id ${req.params.id}` }
      })
    }
    res.json(workshop)
  })

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  return app
}
