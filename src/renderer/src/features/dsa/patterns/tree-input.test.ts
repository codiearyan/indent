import { describe, expect, it } from 'vitest'
import { levelOrder } from './tree-input'

describe('level order tree input', () => {
  it('links children in level order and skips null slots', () => {
    expect(levelOrder('5, 3, 8, 1, 4, null, 9')).toEqual([
      { id: 'n0', value: 5, left: 'n1', right: 'n2' },
      { id: 'n1', value: 3, left: 'n3', right: 'n4' },
      { id: 'n2', value: 8, right: 'n5' },
      { id: 'n3', value: 1 },
      { id: 'n4', value: 4 },
      { id: 'n5', value: 9 }
    ])
  })

  it('gives child slots only to nodes that exist', () => {
    const chain = levelOrder('1 null 2 null 3')
    expect(chain.map((node) => [node.left, node.right])).toEqual([
      [undefined, 'n1'],
      [undefined, 'n2'],
      [undefined, undefined]
    ])
  })

  it('rejects trees it cannot build', () => {
    expect(() => levelOrder('')).toThrow(/root/)
    expect(() => levelOrder('null, 1')).toThrow(/root/)
    expect(() => levelOrder('1, x')).toThrow(/whole number/)
    expect(() => levelOrder('1, 2, 1')).toThrow(/different/)
    expect(() => levelOrder('1, null, null, 2')).toThrow(/no parent/)
    expect(() => levelOrder(Array.from({ length: 16 }, (_, i) => i).join(','))).toThrow(
      /at most 15/
    )
  })
})
