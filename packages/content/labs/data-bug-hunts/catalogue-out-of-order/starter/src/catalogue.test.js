// Tasks 1 and 3: the tests that would have caught WH-52.
//
// Task 1 goes in the 'the ticket' block: tests that fail on the shop's catalogueOrder() today and
// pass once it is fixed. One list is not enough: Check also runs them beside a version that
// mends only the ticket's own catalogue.
// Task 3 goes in the 'next door' block: a test for the case next to the ticket, a computer set to
// another language.
// Run them with: npx vitest run src/catalogue.test.js
import { describe, expect, it } from 'vitest'
import { catalogueOrder } from './catalogue.js'
import { catalogue } from './arrangements.js'

describe('the ticket', () => {
  it('puts titles in reading order', () => {
    throw new Error('Not implemented')
  })
})

describe('next door', () => {
  it('reads the same on a computer set to another language', () => {
    throw new Error('Not implemented')
  })
})
