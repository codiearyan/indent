import { describe, test, expect } from 'vitest'
import { deliveryCharge, totalWeight, heaviestBox, tripsNeeded } from './delivery.js'

describe('deliveryCharge', () => {
  test('is free for an order of exactly 40', () => {
    expect(deliveryCharge(40)).toBe(0)
  })

  test('costs 4 for an order just under 40', () => {
    expect(deliveryCharge(39.99)).toBe(4)
  })
})

describe('totalWeight', () => {
  test('is 0 on a Friday with no boxes', () => {
    expect(totalWeight([])).toBe(0)
  })
})

describe('heaviestBox', () => {
  const light = { customer: 'Cora Pellow', kilos: 4 }
  const middle = { customer: 'Amos Hale', kilos: 6 }
  const heavy = { customer: 'Nia Brook', kilos: 9 }

  test('finds the heaviest box when it comes first', () => {
    expect(heaviestBox([heavy, light, middle])).toEqual(heavy)
  })

  test('finds the heaviest box when it comes last', () => {
    expect(heaviestBox([light, middle, heavy])).toEqual(heavy)
  })
})

describe('tripsNeeded', () => {
  test('needs no trips for no boxes', () => {
    expect(tripsNeeded(0)).toBe(0)
  })

  test('needs one trip for exactly one full van', () => {
    expect(tripsNeeded(12)).toBe(1)
  })

  test('needs a second trip for one box more', () => {
    expect(tripsNeeded(13)).toBe(2)
  })
})
