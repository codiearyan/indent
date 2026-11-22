// Sefton's checks for the quote calculator and the paper store, written as tests for your runner.
// Run with: node tests/quote.test.js
import { test, main } from '../src/runner.js'
import { expect } from '../src/expect.js'
import { breakdown, quote } from '../src/quote.js'
import { sheetsInStock, supplierPrice } from '../src/paper.js'

test('100 cards in one colour', () => {
  expect(quote({ item: 'card', quantity: 100 })).toBe(4500)
})

test('two colours cost two passes', () => {
  expect(quote({ item: 'card', quantity: 100, colours: 2 })).toBe(9000)
})

test('small jobs pay the minimum', () => {
  expect(quote({ item: 'card', quantity: 20 })).toBe(2500)
})

test('250 cards get the bulk price', () => {
  expect(quote({ item: 'card', quantity: 250 })).toBe(8250)
})

test('a printed quote shows every part', () => {
  expect(breakdown({ item: 'invite', quantity: 100 })).toEqual({ setup: 1500, printing: 8500, total: 10000 })
})

test('an unknown item is refused', () => {
  expect(() => quote({ item: 'mug', quantity: 1 })).toThrow('Unknown item')
})

test('there is card for 1000 cards', async () => {
  const sheets = await sheetsInStock('card')
  expect(sheets >= 1000).toBe(true)
})

test('there is paper for 100 posters', async () => {
  const sheets = await sheetsInStock('poster')
  expect(sheets >= 100).toBe(true)
})

test(
  'the supplier has a price for card',
  async () => {
    const price = await supplierPrice('card')
    expect(typeof price).toBe('number')
  },
  { timeout: 500 }
)

await main()
