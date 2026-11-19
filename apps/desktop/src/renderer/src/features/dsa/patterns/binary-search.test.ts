import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { binarySearch } from './binary-search'

describe('binary search', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(binarySearch)
  })

  it('agrees with scanning every value', () => {
    const full = [1, 3, 3, 5, 8, 13, 21, 34, 34, 55, 60, 72, 80, 88, 90, 99]
    const arrays = [...full.map((_, i) => full.slice(0, i + 1)), [-7, -2, 0, 4], [6, 6, 6]]
    for (const nums of arrays) {
      for (let target = -9; target <= 101; target++) {
        const steps = binarySearch.build({ nums: nums.join(', '), target: String(target) })
        const answer = steps.at(-1)?.vars?.answer
        if (!nums.includes(target)) {
          expect(answer, `${nums} target ${target}`).toBe('not found')
          continue
        }
        expect(nums[answer as number], `${nums} target ${target}`).toBe(target)
      }
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => binarySearch.build({ nums: '3, 1, 2', target: '2' })).toThrow(/sorted/)
    expect(() => binarySearch.build({ nums: '', target: '2' })).toThrow(/numbers/)
    expect(() => binarySearch.build({ nums: '1, 2', target: '1.5' })).toThrow(/whole number/)
  })
})
