import { describe, expect, it } from 'vitest'
import { syncBookings } from './sync.js'
import { createFakeStore, evening } from './store.js'

describe('syncBookings', () => {
  it('saves every booking before it resolves', async () => {
    const store = createFakeStore({ delayMs: 5 })
    expect(await syncBookings(evening, store)).toBe(3)
    expect(store.saved().sort()).toEqual(['b101', 'b102', 'b103'])
  })

  it('rejects when a save fails', async () => {
    const store = createFakeStore({ delayMs: 5, failOn: ['b102'] })
    await expect(syncBookings(evening, store)).rejects.toThrow('Could not save b102')
  })
})
