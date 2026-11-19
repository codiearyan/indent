import { describe, expect, it } from 'vitest'
import { layoutTree } from './treeLayout'

const nodes = [
  { id: 'a', value: 8, left: 'b', right: 'c' },
  { id: 'b', value: 4, left: 'd', right: 'e' },
  { id: 'c', value: 12, right: 'f' },
  { id: 'd', value: 2 },
  { id: 'e', value: 6 },
  { id: 'f', value: 14 },
  { id: 'z', value: 99 }
]

describe('layoutTree', () => {
  const slots = layoutTree({ root: 'a', nodes })

  it('places only reachable nodes', () => {
    expect([...slots.keys()].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('gives every node a distinct position', () => {
    const keys = new Set([...slots.values()].map((s) => `${s.order},${s.depth}`))
    expect(keys.size).toBe(slots.size)
  })

  it('puts parents above children and left subtrees to the left', () => {
    for (const node of nodes) {
      const slot = slots.get(node.id)
      if (!slot) continue
      for (const [side, child] of [
        ['left', node.left],
        ['right', node.right]
      ] as const) {
        const c = child ? slots.get(child) : undefined
        if (!c) continue
        expect(c.depth).toBe(slot.depth + 1)
        expect(c.parent).toBe(node.id)
        if (side === 'left') expect(c.order).toBeLessThan(slot.order)
        else expect(c.order).toBeGreaterThan(slot.order)
      }
    }
  })

  it('handles an empty tree and a cycle', () => {
    expect(layoutTree({ root: null, nodes }).size).toBe(0)
    const cyclic = [
      { id: 'x', value: 1, left: 'y' },
      { id: 'y', value: 2, left: 'x' }
    ]
    expect(layoutTree({ root: 'x', nodes: cyclic }).size).toBe(2)
  })
})
