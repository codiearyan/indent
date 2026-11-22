// bookingsRouter(store) answers POST /bookings with { workshopId, name } from the sign-up page.
// It answers 201 with the new booking, 404 when the workshop is not there and 400 when the body
// is not a booking.
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
    if (result.problem === 'not_found') {
      return res
        .status(404)
        .json({ error: { code: 'not_found', message: `No workshop has the id ${workshopId}` } })
    }
    res.status(201).json(result.booking)
  })

  return router
}
