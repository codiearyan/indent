import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { ordersOpen, deliveryDay, holdBasket } from './schedule.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('delivery day', () => {
  test('an order on Monday 2 March goes out on Friday 6 March', () => {
    vi.setSystemTime(new Date(2026, 2, 2, 10, 0))
    expect(deliveryDay()).toBe('2026-03-06')
  })
})

describe('cut-off', () => {
  test('orders are open at 17:59 on Wednesday', () => {
    vi.setSystemTime(new Date(2026, 2, 4, 17, 59))
    expect(ordersOpen()).toBe(true)
  })

  test('orders are closed at 18:00 on Wednesday', () => {
    vi.setSystemTime(new Date(2026, 2, 4, 18, 0))
    expect(ordersOpen()).toBe(false)
  })
})

describe('basket hold', () => {
  test('a basket is held for the whole 15 minutes, then let go', () => {
    const hold = holdBasket(['squash'])
    vi.advanceTimersByTime(15 * 60 * 1000 - 1)
    expect(hold.status).toBe('held')
    vi.advanceTimersByTime(1)
    expect(hold.status).toBe('released')
  })
})
