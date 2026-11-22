// Tasks: Create a workshop, Check what was sent, Refuse a bad workshop
//
// - POST /workshops reads a JSON body, saves the workshop in the store and answers 201 with the
//   saved workshop and a location header that points at it, like /workshops/6. Only title, day,
//   seats and priceCents are saved; the store picks the id.
// - a body that validateWorkshop finds problems in answers 400 with
//   { error: { code: 'validation_failed', message, fields } }, where fields lists those problems,
//   and nothing is saved.
// The routes from the last issue stay as they are.
import express from 'express'
import { createStore } from './store.js'
import { FIELDS, validateWorkshop } from './validate.js'
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
