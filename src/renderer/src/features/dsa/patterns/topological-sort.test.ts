import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { topologicalSort } from './topological-sort'

type Edge = [string, string]

function parse(raw: string): { nodes: string[]; edges: Edge[] } {
  const edges = raw.split(',').map((part) => part.trim().split('>') as Edge)
  return { nodes: [...new Set(edges.flat())], edges }
}

function hasCycle(nodes: string[], edges: Edge[]): boolean {
  const state = new Map<string, 'open' | 'done'>()
  const visit = (node: string): boolean => {
    if (state.get(node) === 'open') return true
    if (state.get(node) === 'done') return false
    state.set(node, 'open')
    const found = edges.some(([from, to]) => from === node && visit(to))
    state.set(node, 'done')
    return found
  }
  return nodes.some(visit)
}

function expectCorrect(raw: string): void {
  const { nodes, edges } = parse(raw)
  const answer = String(topologicalSort.build({ edges: raw }).at(-1)?.vars?.answer)
  if (hasCycle(nodes, edges)) {
    expect(answer, raw).toBe('cycle')
    return
  }
  const order = answer.split(', ')
  expect([...order].sort(), raw).toEqual([...nodes].sort())
  for (const [from, to] of edges) {
    expect(order.indexOf(from) < order.indexOf(to), `${raw}: ${from} before ${to}`).toBe(true)
  }
}

describe('topological sort', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(topologicalSort)
  })

  it('gives a valid order, or reports a cycle, for every preset', () => {
    for (const preset of topologicalSort.presets) expectCorrect(preset.values.edges)
    expect(topologicalSort.build(topologicalSort.presets[1].values).at(-1)?.vars?.answer).toBe(
      'cycle'
    )
  })

  it('is right on a spread of generated task lists', () => {
    let seed = 7
    const next = (limit: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % limit
    }
    const letters = 'ABCDEFG'
    for (let round = 0; round < 300; round++) {
      const edges = new Set<string>()
      const count = 1 + next(9)
      while (edges.size < count) {
        const from = next(7)
        let to = next(7)
        // mostly forward edges so most rounds have an order, a few backward ones make cycles
        if (to === from) to = (to + 1) % 7
        if (to < from && next(5) > 0) continue
        edges.add(`${letters[from]}>${letters[to]}`)
      }
      expectCorrect([...edges].join(', '))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => topologicalSort.build({ edges: 'A>' })).toThrow(/like A>B/)
    expect(() => topologicalSort.build({ edges: 'A>B, A>B' })).toThrow(/twice/)
    expect(() => topologicalSort.build({ edges: 'A>A' })).toThrow(/itself/)
    expect(() => topologicalSort.build({ edges: 'A>B, C>D, E>F, G>H' })).toThrow(/7/)
  })
})
