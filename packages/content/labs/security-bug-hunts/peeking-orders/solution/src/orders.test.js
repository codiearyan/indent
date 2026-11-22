import { describe, expect, it } from 'vitest'
import { openDb } from './db.js'
import { getOrder } from './orders.js'

describe('getOrder', () => {
  it('shows an order only to its customer', () => {
    const db = openDb()
    expect(getOrder(db, { customerId: 101 }, 2041)?.id).toBe(2041)
    expect(getOrder(db, { customerId: 102 }, 2041)).toBeNull()
  })

  it('answers the same for an order that is not theirs and one that does not exist', () => {
    const db = openDb()
    expect(getOrder(db, { customerId: 102 }, 2041)).toEqual(getOrder(db, { customerId: 102 }, 9999))
  })
})
