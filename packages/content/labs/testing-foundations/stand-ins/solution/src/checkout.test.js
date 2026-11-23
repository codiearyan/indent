import { describe, test, expect, vi, afterEach } from 'vitest'
import { EXTRAS, surpriseExtra, checkout } from './checkout.js'

const cora = { customer: 'Cora Pellow', total: 26.5 }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('surprise extra', () => {
  test('a random number near 1 picks the last extra', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(surpriseExtra()).toBe('bag of apples')
  })

  test('a random number of 0 picks the first extra', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(surpriseExtra()).toBe('jar of honey')
  })
})

describe('charge', () => {
  test('charges the customer once, in pence', async () => {
    const cards = { charge: vi.fn().mockResolvedValue({ id: 'r-1' }) }
    await checkout(cora, cards, [])
    expect(cards.charge).toHaveBeenCalledTimes(1)
    expect(cards.charge).toHaveBeenCalledWith('Cora Pellow', 2650)
  })
})

describe('declined card', () => {
  test('a declined card leaves the order unpaid and off the packing list', async () => {
    const cards = { charge: vi.fn().mockRejectedValue(new Error('Card declined')) }
    const packingList = []
    await expect(checkout(cora, cards, packingList)).resolves.toEqual({
      status: 'unpaid',
      reason: 'Card declined'
    })
    expect(packingList).toEqual([])
  })
})
