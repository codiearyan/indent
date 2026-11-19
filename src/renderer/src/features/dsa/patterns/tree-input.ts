import { integer } from '../input'
import type { TreeFrame, Tone } from '../types'

export interface TreeNode {
  id: string
  value: number
  left?: string
  right?: string
}

const MAX_NODES = 15

/**
 * Reads a tree written level by level, such as `5, 3, 8, 1, 4, null, 9`: each existing node, in
 * reading order, takes the next two entries as its left and right child, and `null` is an empty
 * slot. The first node is the root. Values must differ so a note can name a node by its value.
 */
export function levelOrder(raw: string, label = 'The tree'): TreeNode[] {
  const tokens = raw.split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0 || tokens[0].toLowerCase() === 'null') {
    throw new Error(`${label} needs a root value first.`)
  }
  const nodes: TreeNode[] = []
  const make = (token: string): TreeNode | undefined => {
    if (token.toLowerCase() === 'null') return undefined
    const value = integer(token, {
      label: `Each value in ${label.toLowerCase()}`,
      min: -99,
      max: 99
    })
    if (nodes.some((node) => node.value === value)) {
      throw new Error(
        `Each value in ${label.toLowerCase()} must be different, and ${value} repeats.`
      )
    }
    if (nodes.length === MAX_NODES)
      throw new Error(`${label} can have at most ${MAX_NODES} values.`)
    const node: TreeNode = { id: `n${nodes.length}`, value }
    nodes.push(node)
    return node
  }

  const queue = [make(tokens[0]) as TreeNode]
  let i = 1
  while (i < tokens.length) {
    const parent = queue.shift()
    if (!parent) {
      throw new Error(`${label} has values with no parent to hang from. Check the null entries.`)
    }
    for (const side of ['left', 'right'] as const) {
      if (i >= tokens.length) break
      const child = make(tokens[i++])
      if (child) {
        parent[side] = child.id
        queue.push(child)
      }
    }
  }
  return nodes
}

export function treeFrame(
  nodes: TreeNode[],
  tones: Record<string, Tone>,
  pointers: TreeFrame['pointers'] = []
): TreeFrame {
  return {
    kind: 'tree',
    label: 'tree',
    root: nodes[0].id,
    nodes: nodes.map((node) => ({ ...node, tone: tones[node.id] })),
    pointers
  }
}
