import { describe, expect, it } from 'vitest'
import type { FlowScene } from '@shared/types'
import { layoutScene, NODE_W } from './layout'

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
