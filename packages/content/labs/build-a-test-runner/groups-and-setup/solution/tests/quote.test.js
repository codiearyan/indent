// Sefton's tests for the press, in groups.
// Run with: node tests/quote.test.js
// While you fix one test, change its test( to test.only( and only that one runs.
import { beforeEach, describe, test, main } from '../src/runner.js'
import { expect } from '../src/expect.js'
import { breakdown, quote } from '../src/quote.js'
import { sheetsInStock, supplierPrice } from '../src/paper.js'
import { createJobBook } from '../src/jobs.js'

describe('quote', () => {
  describe('cards', () => {
    test('100 in one colour', () => {
      expect(quote({ item: 'card', quantity: 100 })).toBe(4500)
    })

    test('two colours cost two passes', () => {
      expect(quote({ item: 'card', quantity: 100, colours: 2 })).toBe(9000)
    })

    test('small jobs pay the minimum', () => {
      expect(quote({ item: 'card', quantity: 20 })).toBe(2500)
    })

    test('250 get the bulk price', () => {
      expect(quote({ item: 'card', quantity: 250 })).toBe(8250)
    })
  })

  test('a printed quote shows every part', () => {
    expect(breakdown({ item: 'invite', quantity: 100 })).toEqual({ setup: 1500, printing: 8500, total: 10000 })
  })

  test('an unknown item is refused', () => {
    expect(() => quote({ item: 'mug', quantity: 1 })).toThrow('Unknown item')
  })
})

describe('paper', () => {
  test('there is card for 1000 cards', async () => {
    expect((await sheetsInStock('card')) >= 1000).toBe(true)
  })

  test('there is paper for 100 posters', async () => {
    expect((await sheetsInStock('poster')) >= 100).toBe(true)
  })

  test(
    'the supplier has a price for card',
    async () => {
      expect(typeof (await supplierPrice('card'))).toBe('number')
    },
    { timeout: 500 }
  )
})

describe('job book', () => {
  let book

  beforeEach(() => {
    book = createJobBook()
  })

  test('starts the day empty', () => {
    expect(book.count()).toBe(0)
  })

  test('adds a job', () => {
    book.add({ item: 'card', quantity: 100 })
    expect(book.count()).toBe(1)
  })

  test('adds up the day', () => {
    book.add({ item: 'card', quantity: 100 })
    book.add({ item: 'poster', quantity: 10 })
    expect(book.total()).toBe(10000)
  })
})

await main()
