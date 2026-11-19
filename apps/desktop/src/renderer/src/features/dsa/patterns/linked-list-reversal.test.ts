import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import type { ListFrame } from '../types'
import { linkedListReversal } from './linked-list-reversal'

describe('linked list reversal', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(linkedListReversal)
  })

  it('flips one link at a time and ends with every link reversed', () => {
    for (let length = 1; length <= 10; length++) {
      const values = Array.from({ length }, (_, i) => (i * 3) % 11)
      const steps = linkedListReversal.build({ values: values.join(', ') })
      const where = `length ${length}`
      expect(steps.at(-1)?.vars?.answer, where).toBe([...values].reverse().join(' -> '))

      const lists = steps.map((step) => step.frames[0] as ListFrame)
      lists.forEach((list, i) => {
        expect(
          list.nodes.map((node) => node.value),
          where
        ).toEqual(values)
        if (i === 0) return
        const changed = list.nodes.filter((node, j) => node.next !== lists[i - 1].nodes[j].next)
        expect(changed.length, `${where} step ${i + 1}`).toBeLessThanOrEqual(1)
      })

      const last = lists.at(-1) as ListFrame
      last.nodes.forEach((node, j) => {
        expect(node.next, where).toBe(j === 0 ? null : last.nodes[j - 1].id)
      })
      expect(last.pointers?.find((p) => p.label === 'prev')?.node, where).toBe(
        last.nodes.at(-1)?.id
      )
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => linkedListReversal.build({ values: '' })).toThrow(/numbers/)
    expect(() => linkedListReversal.build({ values: '1, a' })).toThrow(/whole number/)
  })
})
