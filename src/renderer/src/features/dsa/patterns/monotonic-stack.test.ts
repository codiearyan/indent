import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { monotonicStack } from './monotonic-stack'

function nextGreater(nums: number[]): string {
  return nums.map((value, i) => nums.slice(i + 1).find((later) => later > value) ?? -1).join(', ')
}

function allArrays(values: number[], maxLength: number): number[][] {
  let level: number[][] = [[]]
  const all: number[][] = []
  for (let length = 1; length <= maxLength; length++) {
    level = level.flatMap((prefix) => values.map((value) => [...prefix, value]))
    all.push(...level)
  }
  return all
}

describe('monotonic stack', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(monotonicStack)
  })

  it('agrees with scanning right of every position', () => {
    const arrays = [
      ...allArrays([1, 2, 3], 5),
      [2, 7, 3, 5, 4, 6, 8],
      [-3, 999, -999, 0, 12, 11, 10, 9, 8, 7, 6, 13]
    ]
    for (const nums of arrays) {
      const answer = monotonicStack.build({ nums: nums.join(', ') }).at(-1)?.vars?.answer
      expect(answer, String(nums)).toBe(nextGreater(nums))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => monotonicStack.build({ nums: '' })).toThrow(/numbers/)
    expect(() => monotonicStack.build({ nums: '1, 2, three' })).toThrow(/whole number/)
  })
})
