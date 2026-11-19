import type { Pattern, Step, Tone } from '../types'
import { levelOrder, treeFrame, type TreeNode } from './tree-input'

const code = `interface TreeNode {
  value: number
  left: TreeNode | null
  right: TreeNode | null
}

function maxDepth(node: TreeNode | null): number {
  if (node === null) return 0
  const left = maxDepth(node.left)
  const right = maxDepth(node.right)
  return 1 + Math.max(left, right)
}`

function build(values: Record<string, string>): Step[] {
  const nodes = levelOrder(values.tree)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const steps: Step[] = []
  const stack: { key: string; value: string; node?: TreeNode }[] = []
  const returned: { key: string; value: number }[] = []
  const done = new Set<string>()
  let nullCalls = 0

  const snapshot = (
    lines: number[],
    note: string,
    vars: Record<string, string | number> = {}
  ): void => {
    const tones: Record<string, Tone> = {}
    for (const id of done) tones[id] = 'good'
    const top = stack.at(-1)
    const waiting = stack.findLast((call) => call.node)?.node
    if (waiting) tones[waiting.id] = top?.node ? 'active' : 'compare'
    steps.push({
      frames: [
        treeFrame(
          nodes,
          tones,
          top?.node ? [{ label: 'node', node: top.node.id, tone: 'active' }] : []
        ),
        {
          kind: 'bucket',
          label: 'call stack',
          shape: 'stack',
          items: stack.map((call, i) => ({
            key: call.key,
            value: call.value,
            tone: i === stack.length - 1 ? 'active' : undefined
          }))
        },
        {
          kind: 'map',
          label: 'depth returned',
          entries: returned.map((entry, i) => ({
            ...entry,
            tone: i === returned.length - 1 ? 'good' : undefined
          }))
        }
      ],
      vars: { calls: stack.length, ...vars },
      lines,
      note
    })
  }

  const callNull = (parent: TreeNode, side: 'left' | 'right'): number => {
    stack.push({ key: `null-${nullCalls++}`, value: 'maxDepth(null)' })
    snapshot(
      [7, 8],
      `${parent.value} has no ${side} child, so maxDepth(null) is called. An empty spot adds no depth, so it returns 0 straight away.`
    )
    stack.pop()
    return 0
  }

  const call = (node: TreeNode, parent?: TreeNode): number => {
    stack.push({ key: node.id, value: `maxDepth(${node.value})`, node })
    snapshot(
      [8, 9],
      parent
        ? `Go down into ${node.value}. ${parent.value} waits on the stack, because it cannot answer until this call returns.`
        : `Call maxDepth on the root, ${node.value}. It is not empty, so before it can answer it has to ask its left child.`
    )

    const leftChild = node.left ? byId.get(node.left) : undefined
    const left = leftChild ? call(leftChild, node) : callNull(node, 'left')
    snapshot(
      [9, 10],
      `Back up in ${node.value}: its left side is ${left} deep. Now it asks its right child.`,
      { left }
    )

    const rightChild = node.right ? byId.get(node.right) : undefined
    const right = rightChild ? call(rightChild, node) : callNull(node, 'right')
    const depth = 1 + Math.max(left, right)
    stack.pop()
    done.add(node.id)
    returned.push({ key: String(node.value), value: depth })
    snapshot(
      [10, 11],
      `Back up in ${node.value}: left is ${left}, right is ${right}. It returns 1 + max(${left}, ${right}) = ${depth}${parent ? ` to ${parent.value}` : ''}, counting itself plus its deeper side.`,
      { left, right }
    )
    return depth
  }

  const answer = call(nodes[0])
  snapshot(
    [11],
    `The root's call returned ${answer}, so the longest path from the root down to a leaf has ${answer} ${answer === 1 ? 'node' : 'nodes'}.`,
    { answer }
  )
  return steps
}

export const treeDfs: Pattern = {
  id: 'tree-dfs',
  title: 'Tree depth first',
  group: 'Trees and graphs',
  tagline: 'Let each node ask its children, then combine their answers on the way back up.',
  problem:
    'Given a binary tree, find its maximum depth: the number of nodes on the longest path from the root down to a leaf.',
  signals: [
    'The answer for a node can be built from the answers for its left and right subtrees.',
    'The problem asks about paths from the root to leaves, heights, sizes or sums of subtrees.',
    'You need to explore one branch all the way down before moving to the next.'
  ],
  idea: `Trust the recursion. If you knew how deep the left subtree and the right subtree were, the depth of the whole tree would be one more than the deeper of the two. An empty tree has depth 0, which is where the calls stop.

Each call waits on the call stack while it asks its children, so the stack always holds the path from the root to the node being worked on. Going down pushes a call; returning pops it and hands a number to the parent.

The work happens on the way back up: a node can only answer once both children have answered, so leaves finish first and the root finishes last.`,
  complexity: {
    time: 'O(n)',
    space: 'O(h)',
    why: 'Every node is called once and does constant work. The call stack holds one call per level of the current path, so it grows to the height h of the tree, which is n for a tree shaped like a line.'
  },
  mistakes: [
    'Forgetting the empty case, so the code reads .left of null and crashes.',
    'Returning max(left, right) without adding 1 for the current node.',
    'Assuming recursion is free on a very deep tree: a tree shaped like a long line can overflow the call stack.'
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
    { label: 'Leaning right', values: { tree: '1, null, 2, null, 3, null, 4, null, 5' } }
  ],
  build
}
