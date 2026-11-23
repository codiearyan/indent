// Tests for packing.js. Each describe block holds the tests for one task.
//
// Task 1: in the packing order block, test the order the items go in, by what comes out.
// Task 2: in the crate block, replace Lorcan's test with tests of the crate on the list.
// Task 3: in the total weight block, replace Lorcan's test with one whose answer you work out by hand.
//
// Run the tests with: npx vitest run src/packing.test.js
import { describe, test, expect, vi } from 'vitest'
import { helpers, packingList } from './packing.js'

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
  test.todo('replace this line with your tests')
})

// Lorcan's test. It broke when Effie tidied packing.js, though every box came out the same.
describe('crate', () => {
  test('asks crateFor about the total weight', () => {
    const crateFor = vi.spyOn(helpers, 'crateFor')
    packingList(nell)
    expect(crateFor).toHaveBeenCalledWith(4.5)
  })
})

// Lorcan's test. It passed the week the scales added up wrong.
describe('total weight', () => {
  test('weighs the whole box', () => {
    expect(packingList(nell).kg).toBe(helpers.totalKg(nell.items))
  })
})
