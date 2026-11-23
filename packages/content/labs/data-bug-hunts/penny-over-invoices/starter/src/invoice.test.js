// Tasks 1 and 3: the tests that would have caught WH-31.
//
// Task 1 goes in the 'the ticket' block: tests that fail on the shop's invoice() today and pass
// once it is fixed. One invoice is not enough: Check also runs them beside a version that mends
// only the ticket's own invoice.
// Task 3 goes in the 'next door' block: a test for the case next to the ticket, a line whose VAT
// is exactly half a penny.
// Run them with: npx vitest run src/invoice.test.js
import { describe, expect, it } from 'vitest'
import { invoice } from './invoice.js'
import { angsoKammarkor, cedarNarrows, surSangam } from './invoices.js'

describe('the ticket', () => {
  it('adds up to the penny', () => {
    throw new Error('Not implemented')
  })
})

describe('next door', () => {
  it('rounds half a penny the way the shop chose', () => {
    throw new Error('Not implemented')
  })
})
