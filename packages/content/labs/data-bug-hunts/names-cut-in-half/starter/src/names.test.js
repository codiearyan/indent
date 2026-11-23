// Tasks 1 and 3: the tests that would have caught WH-57.
//
// Task 1 goes in the 'the ticket' block: tests that fail on the shop's names.js today and pass
// once it is fixed. One name is not enough: Check also runs them beside a version that mends
// only the ticket's own name.
// Task 3 goes in the 'next door' block: a test for the case next to the ticket, a name in an
// alphabet with characters that take two code units.
// Run them with: npx vitest run src/names.test.js
import { describe, expect, it } from 'vitest'
import { fitName, nameLength, sameName } from './names.js'
import { LABEL_WIDTH, onFile, pasted } from './contacts.js'

describe('the ticket', () => {
  it('keeps a name with accents whole', () => {
    throw new Error('Not implemented')
  })
})

describe('next door', () => {
  it('keeps a name in another alphabet whole', () => {
    throw new Error('Not implemented')
  })
})
