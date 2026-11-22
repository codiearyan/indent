import { describe, expect, it } from 'vitest'
import { formatBytes, timeLeft } from './moveProgress'

describe('formatBytes', () => {
  it.each([
    [0, '0 bytes'],
    [999, '999 bytes'],
    [12_400, '12.4 KB'],
    [340_000_000, '340 MB'],
    [1_230_000_000, '1.2 GB']
  ])('%d is %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})

describe('timeLeft', () => {
  it('waits until the speed means something', () => {
    expect(timeLeft(100, 1000, 1500)).toBeNull()
    expect(timeLeft(0, 1000, 5000)).toBeNull()
  })

  it.each([
    // A tenth done in 2 seconds leaves 18 seconds.
    [100, 1000, 2000, 'About 20 seconds left'],
    [900, 1000, 20_000, 'A few seconds left'],
    [100, 1000, 8000, 'About a minute left'],
    [100, 1000, 10_000, 'About 2 minutes left'],
    [100, 1000, 60_000, 'About 9 minutes left'],
    [10, 1000, 60_000, 'About 2 hours left']
  ])('%d of %d after %d ms: %s', (bytes, total, elapsed, text) => {
    expect(timeLeft(bytes, total, elapsed)).toBe(text)
  })
})
