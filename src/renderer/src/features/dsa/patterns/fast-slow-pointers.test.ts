import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import type { ListFrame } from '../types'
import { fastSlowPointers } from './fast-slow-pointers'

function hasCycle(length: number, pos: number): boolean {
  const next = Array.from({ length }, (_, i) => (i + 1 < length ? i + 1 : pos))
  const seen = new Set<number>()
  for (let node = 0; node !== -1; node = next[node]) {
    if (seen.has(node)) return true
    seen.add(node)
  }
  return false
}

describe('fast and slow pointers', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(fastSlowPointers)
  })

  it('agrees with walking the list and remembering every node', () => {
    for (let length = 1; length <= 10; length++) {
      for (let pos = -1; pos < length; pos++) {
        const values = Array.from({ length }, (_, i) => (i * 7) % 10).join(', ')
        const steps = fastSlowPointers.build({ values, pos: String(pos) })
        const where = `length ${length} pos ${pos}`
        expect(steps.at(-1)?.vars?.answer, where).toBe(String(hasCycle(length, pos)))
        expect(steps.length, where).toBeLessThanOrEqual(150)

        const last = steps.at(-1)?.frames[0] as ListFrame
        const slow = last.pointers?.find((p) => p.label === 'slow')?.node
        const fast = last.pointers?.find((p) => p.label === 'fast')?.node
        if (hasCycle(length, pos)) expect(slow, where).toBe(fast)
        for (const step of steps) {
          const list = step.frames[0] as ListFrame
          const tail = list.nodes.at(-1)?.next
          expect(tail, where).toBe(pos === -1 ? null : list.nodes[pos].id)
        }
      }
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => fastSlowPointers.build({ values: '1, 2, 3', pos: '3' })).toThrow(/position/)
    expect(() => fastSlowPointers.build({ values: '', pos: '-1' })).toThrow(/numbers/)
    expect(() => fastSlowPointers.build({ values: '1, 2', pos: 'x' })).toThrow(/whole number/)
  })
})
