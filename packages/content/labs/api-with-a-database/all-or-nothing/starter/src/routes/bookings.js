// bookingsRouter(store) answers POST /bookings with { workshopId, name } and POST /bookings/group
// with { workshopId, names } from the sign-up page. It answers 201 with what was booked, 404 when
// the workshop is not there, 409 when it is full and 400 when the body is not a booking.
import express from 'express'

export function bookingsRouter(store) {
  const router = express.Router()

  router.post('/', (req, res) => {
    const { workshopId, name } = req.body ?? {}
    if (!Number.isInteger(workshopId) || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'validation_failed',
          message: 'A booking needs a workshopId and a name',
          fields: ['workshopId', 'name']
        }
      })
    }
    const result = store.book(workshopId, name.trim())
    if (result.problem) return problem(res, result.problem, workshopId)
    res.status(201).json(result.booking)
  })

  router.post('/group', (req, res) => {
    const { workshopId, names } = req.body ?? {}
    const named = Array.isArray(names) && names.length > 0
    if (
      !Number.isInteger(workshopId) ||
      !named ||
      names.some((name) => typeof name !== 'string' || name.trim() === '')
    ) {
      return res.status(400).json({
        error: {
          code: 'validation_failed',
          message: 'A group booking needs a workshopId and a list of names',
          fields: ['workshopId', 'names']
        }
      })
    }
    const result = store.bookGroup(
      workshopId,
      names.map((name) => name.trim())
    )
    if (result.problem) return problem(res, result.problem, workshopId)
    res.status(201).json(result.bookings)
  })

  return router
}

function problem(res, code, workshopId) {
  if (code === 'full') {
    return res
      .status(409)
      .json({ error: { code: 'full', message: 'There are not enough places left' } })
  }
  res
    .status(404)
    .json({ error: { code: 'not_found', message: `No workshop has the id ${workshopId}` } })
}
