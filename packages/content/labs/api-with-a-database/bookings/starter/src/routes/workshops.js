// workshopsRouter(store) returns an Express router with every workshop route: list, read one,
// create, replace, change and remove. A change or a removal answers 404 when the store says no
// row was there, and a removal answers 409 while people have booked the workshop.
import express from 'express'
import { FIELDS, validateWorkshop } from '../validate.js'

const SQLITE_CONSTRAINT_FOREIGNKEY = 787

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
    res.json(store.list({ day, maxPriceCents: maxPrice }))
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
    const problems = validateWorkshop(req.body)
    if (problems.length > 0) return invalid(res, problems)
    const workshop = store.update(Number(req.params.id), pick(req.body))
    if (!workshop) return notFound(res, req.params.id)
    res.json(workshop)
  })

  router.patch('/:id', (req, res) => {
    const problems = validateWorkshop(req.body, { partial: true })
    if (problems.length > 0) return invalid(res, problems)
    const workshop = store.update(Number(req.params.id), pick(req.body))
    if (!workshop) return notFound(res, req.params.id)
    res.json(workshop)
  })

  router.delete('/:id', (req, res) => {
    let removed
    try {
      removed = store.remove(Number(req.params.id))
    } catch (err) {
      // The database refuses to remove a workshop that bookings still point at.
      if (err.errcode === SQLITE_CONSTRAINT_FOREIGNKEY) {
        return res.status(409).json({
          error: { code: 'has_bookings', message: 'People have booked this workshop' }
        })
      }
      throw err
    }
    if (!removed) return notFound(res, req.params.id)
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
