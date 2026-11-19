import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { twoPointers } from './two-pointers'

function hasPair(nums: number[], target: number): boolean {
  return nums.some((a, i) => nums.some((b, j) => i < j && a + b === target))
}

describe('two pointers', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(twoPointers)
  })

  it('agrees with checking every pair', () => {
    const arrays = [
      [1, 3, 4, 6, 8, 11, 13],
      [2, 5, 9, 12],
      [1, 2, 2, 4, 7],
      [-5, -1, 0, 3],
      [4, 4]
    ]
    for (const nums of arrays) {
      for (let target = -8; target <= 26; target++) {
        const steps = twoPointers.build({ nums: nums.join(','), target: String(target) })
        const answer = String(steps.at(-1)?.vars?.answer)
        if (!hasPair(nums, target)) {
          expect(answer, `${nums} target ${target}`).toBe('none')
          continue
        }
        const [left, right] = JSON.parse(answer) as [number, number]
        expect(
          left < right && nums[left] + nums[right] === target,
          `${nums} target ${target}`
        ).toBe(true)
      }
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => twoPointers.build({ nums: '3, 1, 2', target: '4' })).toThrow(/sorted/)
    expect(() => twoPointers.build({ nums: '1', target: '4' })).toThrow(/numbers/)
    expect(() => twoPointers.build({ nums: '1, 2', target: 'x' })).toThrow(/whole number/)
  })
})
