import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import type { ArrayFrame, BucketFrame, TreeFrame } from '../types'
import { backtracking } from './backtracking'

function powerSet(nums: number[]): string[] {
  const all: string[] = []
  for (let mask = 0; mask < 1 << nums.length; mask++) {
    all.push(JSON.stringify(nums.filter((_, i) => mask & (1 << i))))
  }
  return all.sort()
}

describe('backtracking', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(backtracking)
  })

  it('collects exactly every subset, once each, and undoes every choice', () => {
    const inputs = backtracking.presets.map((preset) =>
      preset.values.nums.split(/[\s,]+/).map(Number)
    )
    for (let n = 1; n <= 4; n++) inputs.push(Array.from({ length: n }, (_, i) => i * 3 - 2))
    for (const nums of inputs) {
      const steps = backtracking.build({ nums: nums.join(',') })
      const last = steps.at(-1)!
      const found = String(last.vars?.answer).split(' ')
      expect(new Set(found).size, `${nums}`).toBe(found.length)
      expect([...found].sort(), `${nums}`).toEqual(powerSet(nums))

      const [, stack, tree, result] = last.frames as [
        ArrayFrame,
        BucketFrame,
        TreeFrame,
        ArrayFrame
      ]
      expect(stack.items).toEqual([])
      expect(result.values).toEqual(found)
      expect(tree.nodes.length).toBe(2 ** (nums.length + 1) - 1)
      expect(tree.nodes.every((node) => node.tone === 'good')).toBe(true)
    }
  })

  it('shows choose, recurse and undo as separate steps', () => {
    const lines = backtracking.build({ nums: '1, 2' }).map((step) => step.lines.join(','))
    expect(lines).toContain('9')
    expect(lines).toContain('10')
    expect(lines).toContain('11')
    expect(lines).toContain('12')
  })

  it('rejects input it cannot animate', () => {
    expect(() => backtracking.build({ nums: '1, 2, 3, 4, 5' })).toThrow(/numbers/)
    expect(() => backtracking.build({ nums: '1, 2, 2' })).toThrow(/different/)
    expect(() => backtracking.build({ nums: '1, a' })).toThrow(/whole number/)
  })
})
