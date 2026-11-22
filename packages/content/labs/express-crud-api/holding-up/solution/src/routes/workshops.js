// Task: Move the routes into a router
//
// workshopsRouter(store) returns an Express router with every workshop route: list, read one,
// create, replace, change and remove. Its paths are written from where it is mounted, so the
// list is at '/' and one workshop at '/:id'. The answers stay exactly as they are in app.js now.
import express from 'express'
import { FIELDS, validateWorkshop } from '../validate.js'

export function workshopsRouter(store) {
  const router = express.Router()

  router.get('/', (req, res) => {
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

  router.get('/:id', (req, res) => {
    const workshop = store.get(Number(req.params.id))
    if (!workshop) return notFound(res, req.params.id)
    res.json(workshop)
  })

  router.post('/', (req, res) => {
    const problems = validateWorkshop(req.body)
    if (problems.length > 0) return invalid(res, problems)
    const workshop = store.create(pick(req.body))
    res.status(201).location(`${req.baseUrl}/${workshop.id}`).json(workshop)
  })

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!store.get(id)) return notFound(res, req.params.id)
    const problems = validateWorkshop(req.body)
    if (problems.length > 0) return invalid(res, problems)
    res.json(store.update(id, pick(req.body)))
  })

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!store.get(id)) return notFound(res, req.params.id)
    const problems = validateWorkshop(req.body, { partial: true })
    if (problems.length > 0) return invalid(res, problems)
    res.json(store.update(id, pick(req.body)))
  })

  router.delete('/:id', (req, res) => {
    if (!store.remove(Number(req.params.id))) return notFound(res, req.params.id)
    res.status(204).end()
  })

  return router
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
