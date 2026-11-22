// Sefton's checks for the quote calculator, written as tests for your runner.
// Run with: node tests/quote.test.js
import { test, run } from '../src/runner.js'
import { quote } from '../src/quote.js'

test('100 cards in one colour', () => {
  const price = quote({ item: 'card', quantity: 100 })
  if (price !== 4500) throw new Error(`expected 4500, got ${price}`)
})

test('two colours cost two passes', () => {
  const price = quote({ item: 'card', quantity: 100, colours: 2 })
  if (price !== 9000) throw new Error(`expected 9000, got ${price}`)
})

test('small jobs pay the minimum', () => {
  const price = quote({ item: 'card', quantity: 20 })
  if (price !== 2500) throw new Error(`expected 2500, got ${price}`)
})

test('250 cards get the bulk price', () => {
  const price = quote({ item: 'card', quantity: 250 })
  if (price !== 8250) throw new Error(`expected 8250, got ${price}`)
})

test('an unknown item is refused', () => {
  try {
    quote({ item: 'mug', quantity: 1 })
  } catch {
    return
  }
  throw new Error('expected quote to throw for a mug')
})

console.log(run())
