import { describe, test, expect } from 'vitest'
import { boxContents, packingSlip, weighedPrice, swapItem, APPLES_PER_KILO } from './boxes.js'

describe('boxContents', () => {
  test('a medium box holds six items, heaviest first', () => {
    expect(boxContents('medium')).toEqual([
      'potatoes',
      'carrots',
      'onions',
      'leeks',
      'kale',
      'salad leaves'
    ])
  })
})

describe('packingSlip', () => {
  test("Cora's slip has her name, her box and her eggs", () => {
    const slip = packingSlip({ customer: 'Cora Pellow', size: 'medium', dozens: 2 })
    expect(slip).toEqual({
      customer: 'Cora Pellow',
      size: 'medium',
      items: ['potatoes', 'carrots', 'onions', 'leeks', 'kale', 'salad leaves'],
      eggs: 2
    })
  })
})

describe('weighedPrice', () => {
  test('0.7 kilos of apples costs 1.96', () => {
    expect(weighedPrice(0.7, APPLES_PER_KILO)).toBeCloseTo(1.96)
  })
})

describe('swapItem', () => {
  test('swapping kale for chard gives a new list and leaves the old one alone', () => {
    const before = ['potatoes', 'carrots', 'onions', 'kale']
    const after = swapItem(before, 'kale', 'chard')
    expect(after).toEqual(['potatoes', 'carrots', 'onions', 'chard'])
    expect(before).toEqual(['potatoes', 'carrots', 'onions', 'kale'])
    expect(after).not.toBe(before)
  })
})
