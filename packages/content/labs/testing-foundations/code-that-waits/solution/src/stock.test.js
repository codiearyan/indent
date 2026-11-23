import { describe, test, expect } from 'vitest'
import { countOf, canPack } from './stock.js'

describe('count', () => {
  test('there are 14 leeks in the shed', async () => {
    expect(await countOf('leeks')).toBe(14)
  })
})

describe('enough', () => {
  test('says yes when every item has enough for the boxes', async () => {
    await expect(canPack(['potatoes', 'kale', 'beans'], 9)).resolves.toBe(true)
  })

  test('says no when a later item runs short', async () => {
    await expect(canPack(['potatoes', 'kale', 'beans'], 10)).resolves.toBe(false)
  })
})

describe('unknown item', () => {
  test('names an item the shed has no count for', async () => {
    await expect(countOf('mangoes')).rejects.toThrow('mangoes')
  })
})
