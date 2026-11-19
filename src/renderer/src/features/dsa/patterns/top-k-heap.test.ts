import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import type { ArrayFrame, TreeFrame } from '../types'
import { topKHeap } from './top-k-heap'

function largest(nums: number[], k: number): string {
  return [...nums]
    .sort((a, b) => b - a)
    .slice(0, k)
    .join(', ')
}

function generated(): { nums: number[]; k: number }[] {
  const cases: { nums: number[]; k: number }[] = []
  for (let length = 1; length <= 10; length++) {
    const shapes = [
      Array.from({ length }, (_, i) => i),
      Array.from({ length }, (_, i) => length - i),
      Array.from({ length }, (_, i) => (i * 7) % 5),
      Array.from({ length }, () => 4)
    ]
    for (const nums of shapes) for (let k = 1; k <= length; k++) cases.push({ nums, k })
  }
  return cases
}

describe('top k with a heap', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(topKHeap)
  })

  it('agrees with sorting and taking the first k', () => {
    for (const { nums, k } of generated()) {
      const steps = topKHeap.build({ nums: nums.join(', '), k: String(k) })
      expect(steps.at(-1)?.vars?.answer, `${nums} k ${k}`).toBe(largest(nums, k))
      expect(steps.length, `${nums} k ${k}`).toBeLessThanOrEqual(150)
    }
  })

  it('keeps the heap in order except around the node being sifted', () => {
    for (const { nums, k } of generated()) {
      const steps = topKHeap.build({ nums: nums.join(', '), k: String(k) })
      steps.forEach((step, s) => {
        const where = `${nums} k ${k} step ${s + 1}`
        const tree = step.frames[1] as TreeFrame
        const array = step.frames[2] as ArrayFrame
        const byId = new Map(tree.nodes.map((node) => [node.id, node]))
        expect(array.keys?.[0] ?? null, where).toBe(tree.root)
        array.keys?.forEach((id, i) => {
          const node = byId.get(id)
          expect(node?.value, where).toBe(array.values[i])
          expect(node?.left, where).toBe(array.keys?.[2 * i + 1])
          expect(node?.right, where).toBe(array.keys?.[2 * i + 2])
          const marked = (tone?: string): boolean => tone === 'compare' || tone === 'active'
          for (const childId of [node?.left, node?.right]) {
            const child = childId === undefined ? undefined : byId.get(childId)
            if (child && Number(child.value) < Number(node?.value)) {
              expect(marked(child.tone) || marked(node?.tone), where).toBe(true)
            }
          }
        })
      })
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => topKHeap.build({ nums: '3, 1, 2', k: '4' })).toThrow(/k/)
    expect(() => topKHeap.build({ nums: '3, 1, 2', k: '0' })).toThrow(/k/)
    expect(() => topKHeap.build({ nums: '', k: '1' })).toThrow(/numbers/)
  })
})
