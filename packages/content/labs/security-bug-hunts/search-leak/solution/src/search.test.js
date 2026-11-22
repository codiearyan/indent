import { describe, expect, it } from 'vitest'
import { openDb } from './db.js'
import { searchOrders } from './search.js'

const ids = (rows) => rows.map((row) => row.id)

describe('searchOrders', () => {
  it("only ever finds the customer's own orders", () => {
    const db = openDb()
    expect(ids(searchOrders(db, 101, "' OR 1=1 --"))).toEqual([])
    expect(ids(searchOrders(db, 101, "%' OR title LIKE '%"))).toEqual([])
  })

  it('finds titles with an apostrophe', () => {
    expect(ids(searchOrders(openDb(), 103, "Mother's Day"))).toEqual([2044])
  })

  it('finds plain words', () => {
    expect(ids(searchOrders(openDb(), 101, 'cards'))).toEqual([2043])
  })
})
