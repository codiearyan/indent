// Tasks: Replace a workshop, Change part of a workshop, Remove a workshop
//
// - PUT /workshops/:id replaces the workshop with the body: all four fields are needed, checked
//   with validateWorkshop. It answers 200 with the whole saved workshop.
// - PATCH /workshops/:id changes only the fields it is sent, checked with
//   validateWorkshop(body, { partial: true }), and answers 200 with the whole saved workshop.
// - DELETE /workshops/:id removes the workshop and answers 204 with no body.
// An id the store does not have answers 404 not_found, and a bad body 400 validation_failed, in
// the same shapes as the routes you already have.
import express from 'express'
import { createStore } from './store.js'
import { FIELDS, validateWorkshop } from './validate.js'
import { workshops } from './workshops.js'

export function createApp({ store = createStore(workshops) } = {}) {
  const app = express()
  app.use(express.json())

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
    if (!workshop) return notFound(res, req.params.id)
    res.json(workshop)
  })

  app.post('/workshops', (req, res) => {
    const problems = validateWorkshop(req.body)
    if (problems.length > 0) return invalid(res, problems)
    const workshop = store.create(pick(req.body))
    res.status(201).location(`/workshops/${workshop.id}`).json(workshop)
  })

  app.put('/workshops/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!store.get(id)) return notFound(res, req.params.id)
    const problems = validateWorkshop(req.body)
    if (problems.length > 0) return invalid(res, problems)
    res.json(store.update(id, pick(req.body)))
  })

  app.patch('/workshops/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!store.get(id)) return notFound(res, req.params.id)
    const problems = validateWorkshop(req.body, { partial: true })
    if (problems.length > 0) return invalid(res, problems)
    res.json(store.update(id, pick(req.body)))
  })

  app.delete('/workshops/:id', (req, res) => {
    if (!store.remove(Number(req.params.id))) return notFound(res, req.params.id)
    res.status(204).end()
  })

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'not_found', message: `Nothing answers ${req.method} ${req.path}` }
    })
  })

  return app
}

function pick(body) {
  return Object.fromEntries(
    FIELDS.filter((field) => field in body).map((field) => [field, body[field]])
  )
}

function notFound(res, id) {
  return res
    .status(404)
    .json({ error: { code: 'not_found', message: `No workshop has the id ${id}` } })
}

function invalid(res, fields) {
  return res.status(400).json({
    error: {
      code: 'validation_failed',
      message: `Check these fields: ${fields.join(', ')}`,
      fields
    }
  })
}
