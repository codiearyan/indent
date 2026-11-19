import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { treeBfs } from './tree-bfs'

// Every tree that fits in four levels, written in level order. Node i of a full tree has
// children 2i+1 and 2i+2 and holds the value i + 1, so its level is known without walking.
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

function levelsByIndex(indices: number[]): number[][] {
  const levels: number[][] = []
  for (const i of indices) {
    const level = 31 - Math.clz32(i + 1)
    ;(levels[level] ??= []).push(i + 1)
  }
  return levels
}

describe('tree bfs', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(treeBfs)
  })

  it('answers the presets', () => {
    const answers = treeBfs.presets.map((preset) =>
      JSON.parse(String(treeBfs.build(preset.values).at(-1)?.vars?.answer))
    )
    expect(answers[0]).toEqual([[5], [3, 8], [1, 4, 9], [2, 7]])
    expect(answers[1]).toEqual([[7]])
    expect(answers[2]).toEqual([[1], [2], [3], [4], [5]])
  })

  it('agrees with grouping nodes by their level in every small tree', () => {
    const trees = heapTrees()
    expect(trees.length).toBe(676)
    for (const { raw, indices } of trees) {
      const answer = JSON.parse(String(treeBfs.build({ tree: raw }).at(-1)?.vars?.answer))
      expect(answer, raw).toEqual(levelsByIndex(indices))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => treeBfs.build({ tree: '' })).toThrow(/root/)
    expect(() => treeBfs.build({ tree: '1, x' })).toThrow(/whole number/)
  })
})
