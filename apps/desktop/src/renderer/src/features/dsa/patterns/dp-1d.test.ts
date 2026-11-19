import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { dp1d } from './dp-1d'

function bestByEverySubset(nums: number[]): number {
  let best = 0
  for (let mask = 0; mask < 1 << nums.length; mask++) {
    if (mask & (mask >> 1)) continue
    best = Math.max(
      best,
      nums.reduce((sum, value, i) => (mask & (1 << i) ? sum + value : sum), 0)
    )
  }
  return best
}

describe('dp 1d', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(dp1d)
  })

  it('agrees with trying every set of houses with no two next to each other', () => {
    const inputs = dp1d.presets.map((preset) => preset.values.nums.split(/[\s,]+/).map(Number))
    for (let n = 1; n <= 12; n++) {
      inputs.push(Array.from({ length: n }, (_, i) => (i * 7 + n * 3) % 10))
      inputs.push(Array.from({ length: n }, (_, i) => (i % 3 === 0 ? 9 : 1)))
    }
    for (const nums of inputs) {
      const steps = dp1d.build({ nums: nums.join(',') })
      expect(steps.at(-1)?.vars?.answer, `${nums}`).toBe(bestByEverySubset(nums))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => dp1d.build({ nums: '' })).toThrow(/numbers/)
    expect(() => dp1d.build({ nums: '1, -2' })).toThrow(/zero or more/)
    expect(() => dp1d.build({ nums: Array(13).fill(1).join(',') })).toThrow(/numbers/)
  })
})
