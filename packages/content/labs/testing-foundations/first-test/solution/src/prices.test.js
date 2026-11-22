import { describe, test, expect } from 'vitest'
import { boxPrice, withEggs, deliveryCharge, memberPrice } from './prices.js'

describe('boxPrice', () => {
  test('a small box costs 14', () => {
    expect(boxPrice('small')).toBe(14)
  })
})

describe('withEggs', () => {
  test('a medium box with two dozen eggs costs 27', () => {
    expect(withEggs('medium', 2)).toBe(27)
  })
})

describe('deliveryCharge', () => {
  test('town delivery costs the town price', () => {
    expect(deliveryCharge('town')).toBe(4)
  })
})

describe('memberPrice', () => {
  test('a member pays 2 less for a large box', () => {
    expect(memberPrice('large')).toBe(23)
  })
})
