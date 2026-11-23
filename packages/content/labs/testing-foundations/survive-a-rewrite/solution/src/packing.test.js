// Tests for packing.js. Each describe block holds the tests for one task.
//
// Task 1: in the packing order block, test the order the items go in, by what comes out.
// Task 2: in the crate block, replace Lorcan's test with tests of the crate on the list.
// Task 3: in the total weight block, replace Lorcan's test with one whose answer you work out by hand.
//
// Run the tests with: npx vitest run src/packing.test.js
import { describe, test, expect } from 'vitest'
import { packingList } from './packing.js'

const nell = {
  customer: 'Nell Hollis',
  items: [
    { name: 'carrots', kg: 1 },
    { name: 'squash', kg: 2.5 },
    { name: 'kale', kg: 0.5 },
    { name: 'potatoes', kg: 0.5 }
  ]
}

describe('packing order', () => {
  test('packs the heaviest item first and the lightest last', () => {
    expect(packingList(nell).items).toEqual(['squash', 'carrots', 'kale', 'potatoes'])
  })
})

describe('crate', () => {
  test('puts a box of exactly 5 kg in a small crate', () => {
    const order = { customer: 'Ada Lin', items: [{ name: 'squash', kg: 2.5 }, { name: 'leeks', kg: 2.5 }] }
    expect(packingList(order).crate).toBe('small crate')
  })

  test('puts a box of 5.5 kg in a large crate', () => {
    const order = { customer: 'Ada Lin', items: [{ name: 'squash', kg: 2.5 }, { name: 'leeks', kg: 3 }] }
    expect(packingList(order).crate).toBe('large crate')
  })
})

describe('total weight', () => {
  test('adds up every item, halves of a kilo included', () => {
    expect(packingList(nell).kg).toBe(4.5)
  })
})
