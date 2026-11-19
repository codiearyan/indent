import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { prefixSums } from './prefix-sums'

function rangeSum(nums: number[], from: number, to: number): number {
  let sum = 0
  for (let i = from; i <= to; i++) sum += nums[i]
  return sum
}

describe('prefix sums', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(prefixSums)
  })

  it('agrees with adding up the range directly', () => {
    const arrays = [[3, -1, 4, 1, 5, 9, -2, 6], [7], [0, 0, 0], [-5, 10, -15, 20, 999, -999]]
    for (const nums of arrays) {
      for (let from = 0; from < nums.length; from++) {
        for (let to = from; to < nums.length; to++) {
          const steps = prefixSums.build({
            nums: nums.join(', '),
            from: String(from),
            to: String(to)
          })
          expect(steps.at(-1)?.vars?.answer, `${nums} ${from}..${to}`).toBe(
            rangeSum(nums, from, to)
          )
        }
      }
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => prefixSums.build({ nums: '1, 2, 3', from: '2', to: '1' })).toThrow(/after/)
    expect(() => prefixSums.build({ nums: '1, 2, 3', from: '0', to: '3' })).toThrow(/between/)
    expect(() => prefixSums.build({ nums: '1, x', from: '0', to: '1' })).toThrow(/whole number/)
  })
})
