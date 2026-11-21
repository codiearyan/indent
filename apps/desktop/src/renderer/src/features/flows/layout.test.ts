import { describe, expect, it } from 'vitest'
import type { FlowScene } from '@shared/types'
import { labelHeight, layoutScene, NODE_W, spreadLabels, type PlacedEdge } from './layout'

const node = (id: string): FlowScene['nodes'][number] => ({ id, label: id, kind: 'story' })

function columns(scene: FlowScene): Record<string, number> {
  const layout = layoutScene(scene)
  const xs = [...new Set(layout.nodes.map((n) => n.x))].sort((a, b) => a - b)
  return Object.fromEntries(layout.nodes.map((n) => [n.id, xs.indexOf(n.x)]))
}

describe('layoutScene', () => {
  it('puts each node one column after the furthest node pointing at it', () => {
    const scene: FlowScene = {
      nodes: ['a', 'b', 'c', 'd'].map(node),
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c' },
        { from: 'a', to: 'd' }
      ],
      note: 'n'
    }
    expect(columns(scene)).toEqual({ a: 0, b: 1, d: 1, c: 2 })
  })

  it('stacks nodes of one column in scene order', () => {
    const scene: FlowScene = {
      nodes: ['a', 'top', 'bottom'].map(node),
      edges: [
        { from: 'a', to: 'top' },
        { from: 'a', to: 'bottom' }
      ],
      note: 'n'
    }
    const placed = layoutScene(scene).nodes
    const y = (id: string): number => placed.find((n) => n.id === id)!.y
    expect(y('top')).toBeLessThan(y('bottom'))
  })

  it('settles on a loop and draws the line back under the boxes', () => {
    const scene: FlowScene = {
      nodes: ['a', 'b'].map(node),
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' }
      ],
      note: 'n'
    }
    const layout = layoutScene(scene)
    expect(columns(scene)).toEqual({ a: 0, b: 1 })
    expect(layout.edges.map((e) => e.id)).toEqual(['a->b', 'b->a'])
    expect(layout.height).toBeGreaterThan(layoutScene({ ...scene, edges: [scene.edges[0]] }).height)
  })

  it('is as wide as its columns', () => {
    const scene: FlowScene = { nodes: [node('a')], edges: [], note: 'n' }
    const layout = layoutScene(scene)
    expect(layout.width).toBeGreaterThan(NODE_W)
    expect(layout.width).toBeLessThan(NODE_W + 20)
  })
})

describe('spreadLabels', () => {
  const edge = (id: string, x: number, y: number, label = 'two words'): PlacedEdge => ({
    id,
    label,
    d: '',
    labelAt: { x, y }
  })

  it('moves a label down when it would cover the one above it in the same gap', () => {
    const [a, b] = spreadLabels([edge('a', 300, 100), edge('b', 302, 106)])
    expect(a.labelAt.y).toBe(100)
    expect(b.labelAt.y).toBeGreaterThanOrEqual(100 + 2 + labelHeight('two words'))
  })

  it('leaves labels in other gaps and labels under the line alone', () => {
    const below = { ...edge('c', 300, 104), below: true }
    const [a, b, c] = spreadLabels([edge('a', 300, 100), edge('b', 520, 104), below])
    expect([a.labelAt.y, b.labelAt.y, c.labelAt.y]).toEqual([100, 104, 104])
  })
})
