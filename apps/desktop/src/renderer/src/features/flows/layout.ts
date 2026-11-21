import { edgeId } from '@shared/flow'
import type { FlowNode, FlowScene } from '@shared/types'

export const NODE_W = 136
/** Room for a label of two lines and, on the learner's nodes, the "Your part" line. */
export const NODE_H = 56
const COL_GAP = 80
/** An edge label wraps within the gap between two columns. */
export const LABEL_W = COL_GAP - 8
const ROW_GAP = 16
/** Room for the outline of an active node. */
const PAD = 6
/** Room under the boxes for a line that goes back to an earlier column. */
const BACK_DROP = 28

export interface PlacedNode extends FlowNode {
  x: number
  y: number
}

export interface PlacedEdge {
  id: string
  label?: string
  /** An SVG path, also used as the CSS offset-path of the moving dot. */
  d: string
  labelAt: { x: number; y: number }
  /** The label sits under the line: a line back to an earlier column runs below the boxes. */
  below?: boolean
}

export interface SceneLayout {
  width: number
  height: number
  nodes: PlacedNode[]
  edges: PlacedEdge[]
}

type Point = { x: number; y: number }

function curve(a: Point, b: Point, c: Point, d: Point): Pick<PlacedEdge, 'd' | 'labelAt'> {
  return {
    d: `M ${a.x} ${a.y} C ${b.x} ${b.y}, ${c.x} ${c.y}, ${d.x} ${d.y}`,
    // The middle of a cubic curve.
    labelAt: { x: (a.x + 3 * b.x + 3 * c.x + d.x) / 8, y: (a.y + 3 * b.y + 3 * c.y + d.y) / 8 }
  }
}

/**
 * Left to right: a node sits one column after the furthest node that points at it, and nodes
 * that share a column stack in the order the scene lists them. Lines that would loop are drawn
 * back under the boxes instead of moving a node again, so the layout always settles.
 */
export function layoutScene(scene: FlowScene): SceneLayout {
  const column = new Map(scene.nodes.map((node) => [node.id, 0]))
  for (let pass = 0; pass < scene.nodes.length; pass++) {
    let moved = false
    for (const edge of scene.edges) {
      const next = (column.get(edge.from) ?? 0) + 1
      if (edge.from !== edge.to && next < scene.nodes.length && next > column.get(edge.to)!) {
        column.set(edge.to, next)
        moved = true
      }
    }
    if (!moved) break
  }

  const columns: string[][] = []
  for (const node of scene.nodes) (columns[column.get(node.id)!] ??= []).push(node.id)
  const used = columns.filter(Boolean)
  const tallest = Math.max(...used.map((ids) => ids.length))
  const rowH = NODE_H + ROW_GAP

  const placed = new Map<string, PlacedNode>()
  used.forEach((ids, col) => {
    const offset = ((tallest - ids.length) * rowH) / 2
    ids.forEach((id, row) => {
      const node = scene.nodes.find((candidate) => candidate.id === id)!
      placed.set(id, { ...node, x: PAD + col * (NODE_W + COL_GAP), y: PAD + offset + row * rowH })
    })
  })

  const bottom = PAD + tallest * rowH - ROW_GAP
  let goesBack = false
  const edges = scene.edges.map((edge): PlacedEdge => {
    const from = placed.get(edge.from)!
    const to = placed.get(edge.to)!
    const id = edgeId(edge)
    if (to.x > from.x) {
      const a = { x: from.x + NODE_W, y: from.y + NODE_H / 2 }
      const d = { x: to.x, y: to.y + NODE_H / 2 }
      const bend = (d.x - a.x) / 2
      return {
        id,
        label: edge.label,
        ...curve(a, { x: a.x + bend, y: a.y }, { x: d.x - bend, y: d.y }, d)
      }
    }
    if (to.x === from.x && to.y !== from.y) {
      const down = to.y > from.y
      const a = { x: from.x + NODE_W / 2, y: down ? from.y + NODE_H : from.y }
      const d = { x: to.x + NODE_W / 2, y: down ? to.y : to.y + NODE_H }
      return { id, label: edge.label, ...curve(a, a, d, d) }
    }
    goesBack = true
    const a = { x: from.x + NODE_W / 2, y: from.y + NODE_H }
    const d = { x: to.x + NODE_W / 2 + (to === from ? 24 : 0), y: to.y + NODE_H }
    const low = bottom + BACK_DROP - 6
    return {
      id,
      label: edge.label,
      below: true,
      ...curve(a, { x: a.x, y: low }, { x: d.x, y: low }, d)
    }
  })
  const backLabel = edges.some((edge) => edge.below && edge.label)

  return {
    width: PAD * 2 + used.length * (NODE_W + COL_GAP) - COL_GAP,
    height: bottom + PAD + (goesBack ? BACK_DROP : 0) + (backLabel ? LABEL_LINE + 4 : 0),
    nodes: [...placed.values()],
    edges: spreadLabels(edges)
  }
}

const LABEL_LINE = 13
/** About how many characters of an 11px label fit on one line of LABEL_W. */
const LABEL_CHARS = 12

export function labelHeight(label: string): number {
  return (label.length > LABEL_CHARS ? 2 : 1) * LABEL_LINE + 2
}

/**
 * Labels sit above their line, at its middle. Lines that leave one box for the same column meet
 * there, so a label that would cover the one above it moves down until it clears.
 */
export function spreadLabels(edges: PlacedEdge[]): PlacedEdge[] {
  const placed = edges.map((edge) => ({ ...edge, labelAt: { ...edge.labelAt } }))
  const above = placed
    .filter((edge) => edge.label && !edge.below)
    .sort((a, b) => a.labelAt.y - b.labelAt.y)
  for (let i = 1; i < above.length; i++) {
    const label = above[i]
    for (const earlier of above.slice(0, i)) {
      if (Math.abs(earlier.labelAt.x - label.labelAt.x) >= LABEL_W) continue
      const top = earlier.labelAt.y + 2 + labelHeight(label.label!)
      if (label.labelAt.y < top) label.labelAt.y = top
    }
  }
  return placed
}
