import type { ArrayFrame, Pattern, Step, Tone } from '../types'
import { levelOrder, treeFrame, type TreeNode } from './tree-input'

const code = `function levelOrder(root: TreeNode | null): number[][] {
  if (root === null) return []
  const levels: number[][] = []
  const queue: TreeNode[] = [root]
  while (queue.length > 0) {
    const size = queue.length
    const level: number[] = []
    for (let i = 0; i < size; i++) {
      const node = queue.shift()!
      level.push(node.value)
      if (node.left) queue.push(node.left)
      if (node.right) queue.push(node.right)
    }
    levels.push(level)
  }
  return levels
}`

const format = (levels: number[][]): string =>
  `[${levels.map((level) => `[${level.join(', ')}]`).join(', ')}]`

function build(values: Record<string, string>): Step[] {
  const nodes = levelOrder(values.tree)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const steps: Step[] = []
  const queue: TreeNode[] = [nodes[0]]
  const visited: TreeNode[] = []
  const levels: number[][] = []
  let current: TreeNode | undefined
  let levelStart = 0

  const snapshot = (lines: number[], note: string, vars: Record<string, string | number>): void => {
    const tones: Record<string, Tone> = {}
    for (const node of visited) tones[node.id] = 'good'
    for (const node of queue) tones[node.id] = 'compare'
    if (current) tones[current.id] = 'active'
    const output: ArrayFrame = {
      kind: 'array',
      label: 'visited in order',
      values: nodes.map((_, i) => visited[i]?.value ?? ''),
      tones: Object.fromEntries(visited.map((_, i) => [i, i >= levelStart ? 'active' : 'good']))
    }
    if (visited.length > levelStart) {
      output.range = {
        from: levelStart,
        to: visited.length - 1,
        label: `level ${levels.length + 1}`
      }
    }
    steps.push({
      frames: [
        treeFrame(nodes, tones),
        {
          kind: 'bucket',
          label: 'queue',
          shape: 'queue',
          items: queue.map((node) => ({ key: node.id, value: node.value }))
        },
        output
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [3, 4],
    `The queue starts with the root, ${nodes[0].value}. Nodes leave from the front and children join at the back, so the tree is read one level at a time.`,
    {}
  )

  while (queue.length > 0) {
    const size = queue.length
    const level: number[] = []
    const depth = levels.length + 1
    levelStart = visited.length
    snapshot(
      [5, 6, 7],
      size === 1
        ? `Level ${depth} starts. The queue holds just ${queue[0].value}, so this level has one node.`
        : `Level ${depth} starts. The queue holds ${size} nodes and they are exactly this level, so the loop takes ${size} nodes and no more.`,
      { level: depth, size }
    )

    for (let i = 0; i < size; i++) {
      current = queue.shift() as TreeNode
      visited.push(current)
      level.push(current.value)
      const children = [current.left, current.right]
        .filter((id) => id !== undefined)
        .map((id) => byId.get(id) as TreeNode)
      if (children.length === 0) {
        snapshot(
          [9, 10, 11, 12],
          `Take ${current.value} from the front and add it to level ${depth}. It has no children, so nothing joins the queue.`,
          { level: depth, size }
        )
        continue
      }
      snapshot(
        [9, 10],
        `Take ${current.value} from the front of the queue and add it to level ${depth}.`,
        { level: depth, size }
      )
      queue.push(...children)
      const names = children.map((child) => child.value).join(' and ')
      snapshot(
        [11, 12],
        `${names} ${children.length === 1 ? 'joins' : 'join'} the back of the queue. ${children.length === 1 ? 'It belongs' : 'They belong'} to level ${depth + 1}, and the size taken earlier stops this loop before reaching ${children.length === 1 ? 'it' : 'them'}.`,
        { level: depth, size }
      )
    }

    current = undefined
    snapshot(
      [14],
      `Level ${depth} is complete: [${level.join(', ')}]. ${queue.length > 0 ? `The ${queue.length} ${queue.length === 1 ? 'node' : 'nodes'} left in the queue form the next level.` : 'The queue is empty, so this was the last level.'}`,
      { level: depth, size }
    )
    levels.push(level)
    levelStart = visited.length
  }

  snapshot(
    [16],
    `Every node was visited once, top to bottom and left to right. The levels are ${format(levels)}.`,
    { answer: format(levels) }
  )
  return steps
}

export const treeBfs: Pattern = {
  id: 'tree-bfs',
  title: 'Tree level order',
  group: 'Trees and graphs',
  tagline: 'Visit a tree one level at a time by feeding a queue.',
  problem:
    'Given a binary tree, list its values level by level: the root first, then its children from left to right, then their children, and so on.',
  signals: [
    'The problem talks about levels, rows or depth of a tree: "the rightmost node of each level", "average per level".',
    'You need the nearest node that meets a condition, measured in edges from the root.',
    'The order should be top to bottom and left to right, not down one branch first.'
  ],
  idea: `A queue gives you nodes back in the order you added them. Start with the root, and every time you take a node out, add its children to the back. Children always join behind everyone already waiting, so a whole level leaves the queue before any node of the next level does.

To know where one level ends, read the queue's length at the start of each round. Exactly that many nodes belong to the current level; anything added while you process them belongs to the next one.`,
  complexity: {
    time: 'O(n)',
    space: 'O(w)',
    why: 'Each node enters and leaves the queue once. The queue holds at most one full level plus part of the next, so its size is bounded by the widest level w.'
  },
  mistakes: [
    'Looping while the queue is not empty without saving its size first, which mixes two levels into one.',
    'Using a stack instead of a queue, which turns the walk into depth first and breaks the level order.',
    'Pushing null children and then reading their value, instead of checking a child exists before adding it.'
  ],
  code,
  inputs: [
    {
      name: 'tree',
      label: 'Tree in level order',
      help: 'Up to 15 different whole numbers, null for an empty slot'
    }
  ],
  presets: [
    { label: 'Uneven tree', values: { tree: '5, 3, 8, 1, 4, null, 9, null, 2, 7' } },
    { label: 'Single node', values: { tree: '7' } },
    { label: 'Leaning left', values: { tree: '1, 2, null, 3, null, 4, null, 5' } },
    { label: 'Full tree', values: { tree: '8, 4, 12, 2, 6, 10, 14' } }
  ],
  build
}
