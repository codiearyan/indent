import { describe, test, expect } from 'vitest'
import { placeOrder } from './orders.js'

const cora = { customer: 'Cora Pellow', size: 'medium', dozens: 2, village: 'Tarrow' }

describe('unknown size', () => {
  test('turns away a size the farm does not sell', () => {
    expect(() => placeOrder({ ...cora, size: 'huge' })).toThrow()
  })
})

describe('bad eggs', () => {
  test('throws a RangeError for a negative number of dozens', () => {
    expect(() => placeOrder({ ...cora, dozens: -1 })).toThrow(RangeError)
  })
})

describe('far village', () => {
  test('names the village it does not deliver to', () => {
    expect(() => placeOrder({ ...cora, village: 'Hexley' })).toThrow('Hexley')
  })
})

describe('good order', () => {
  test('lets a good order with eggs through as it was asked', () => {
    expect(placeOrder(cora)).toEqual(cora)
  })
})
