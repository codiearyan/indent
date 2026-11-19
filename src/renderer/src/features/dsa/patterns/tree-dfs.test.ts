import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { treeDfs } from './tree-dfs'

// Every tree that fits in four levels, written in level order. Node i of a full tree has
// children 2i+1 and 2i+2, so its depth is known without walking.
function heapTrees(): { raw: string; indices: number[] }[] {
  const trees: { raw: string; indices: number[] }[] = []
  for (let mask = 1; mask < 1 << 15; mask += 2) {
    const has = (i: number): boolean => i < 15 && (mask & (1 << i)) !== 0
    const indices = Array.from({ length: 15 }, (_, i) => i).filter(has)
    if (indices.some((i) => i > 0 && !has((i - 1) >> 1))) continue
    const tokens = ['1']
    for (const i of indices) {
      for (const child of [2 * i + 1, 2 * i + 2])
        tokens.push(has(child) ? String(child + 1) : 'null')
    }
    while (tokens.at(-1) === 'null') tokens.pop()
    trees.push({ raw: tokens.join(', '), indices })
  }
  return trees
}

const depthOf = (indices: number[]): number => 32 - Math.clz32(Math.max(...indices) + 1)

describe('tree dfs', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(treeDfs)
  })

  it('answers the presets', () => {
    const answers = treeDfs.presets.map(
      (preset) => treeDfs.build(preset.values).at(-1)?.vars?.answer
    )
    expect(answers).toEqual([4, 1, 5])
  })

  it('agrees with the deepest level of every small tree', () => {
    for (const { raw, indices } of heapTrees()) {
      expect(treeDfs.build({ tree: raw }).at(-1)?.vars?.answer, raw).toBe(depthOf(indices))
    }
  })

  it('shows going down and coming back up as separate steps', () => {
    const steps = treeDfs.build({ tree: '1, 2' })
    const stackSizes = steps.map((step) => {
      const stack = step.frames[1]
      return stack.kind === 'bucket' ? stack.items.length : -1
    })
    expect(Math.max(...stackSizes)).toBe(3)
    expect(stackSizes.at(-1)).toBe(0)
  })

  it('rejects input it cannot animate', () => {
    expect(() => treeDfs.build({ tree: 'null' })).toThrow(/root/)
    expect(() => treeDfs.build({ tree: '1, 1' })).toThrow(/different/)
  })
})
