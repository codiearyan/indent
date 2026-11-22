// Written in the last issue.
//
// staffRouter(staff) returns a router with GET / that answers 200 with every staff member as
// { id, name, email, role }, and never a password hash.
import express from 'express'
import { publicStaff } from '../staff.js'

export function staffRouter(staff) {
  const router = express.Router()

  router.get('/', (req, res) => {
    res.json(staff.list().map(publicStaff))
  })

  return router
}
