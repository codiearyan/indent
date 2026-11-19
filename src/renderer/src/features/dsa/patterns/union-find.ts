import { integer } from '../input'
import type { Pattern, Step, Tone } from '../types'

const code = `function countComponents(n: number, pairs: [number, number][]): number {
  const parent = Array.from({ length: n }, (_, i) => i)
  const size = Array<number>(n).fill(1)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  let components = n
  for (const [a, b] of pairs) {
    let rootA = find(a)
    let rootB = find(b)
    if (rootA === rootB) continue
    if (size[rootA] < size[rootB]) [rootA, rootB] = [rootB, rootA]
    parent[rootB] = rootA
    size[rootA] += size[rootB]
    components--
  }
  return components
}`

const MAX_PAIRS = 10

function parsePairs(raw: string, n: number): [number, number][] {
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) throw new Error('List at least one pair, such as 0-1.')
  if (parts.length > MAX_PAIRS) throw new Error(`Use at most ${MAX_PAIRS} pairs.`)
  const seen = new Set<string>()
  return parts.map((part): [number, number] => {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    if (!match)
      throw new Error(`"${part}" should look like 0-1: two node numbers joined by a dash.`)
    const [a, b] = [Number(match[1]), Number(match[2])]
    for (const node of [a, b]) {
      if (node >= n) throw new Error(`Nodes are numbered 0 to ${n - 1}, so ${node} is not a node.`)
    }
    if (a === b) throw new Error(`A pair joins two different nodes, but ${part} names ${a} twice.`)
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`
    if (seen.has(key)) throw new Error(`The pair ${part} is listed twice.`)
    seen.add(key)
    return [a, b]
  })
}

function build(values: Record<string, string>): Step[] {
  const n = integer(values.n, { label: 'The number of nodes', min: 2, max: 8 })
  const pairs = parsePairs(values.pairs, n)
  const parent = Array.from({ length: n }, (_, i) => i)
  const size = Array<number>(n).fill(1)
  const edgeTones: Record<number, Tone> = {}
  const steps: Step[] = []
  let components = n
  let nodeTones: Record<number, Tone> = {}
  let cellTones: Record<number, Tone> = {}

  const rootOf = (x: number): number => (parent[x] === x ? x : rootOf(parent[x]))

  const snapshot = (
    lines: number[],
    note: string,
    vars: Record<string, string | number> = {},
    current?: number
  ): void => {
    steps.push({
      frames: [
        {
          kind: 'graph',
          label: 'nodes',
          nodes: parent.map((_, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
            return {
              id: String(i),
              label: String(i),
              x: 0.5 + 0.4 * Math.cos(angle),
              y: 0.5 + 0.4 * Math.sin(angle),
              tone: nodeTones[i],
              badge: `root ${rootOf(i)}`
            }
          }),
          edges: pairs.map(([a, b], i) => ({
            from: String(a),
            to: String(b),
            tone: i === current ? 'active' : edgeTones[i]
          }))
        },
        { kind: 'array', label: 'parent', values: [...parent], tones: cellTones }
      ],
      vars: { components, ...vars },
      lines,
      note
    })
    nodeTones = {}
    cellTones = {}
  }

  const find = (start: number, line: number, current: number): number => {
    const walked = [start]
    let x = start
    const shortened: string[] = []
    while (parent[x] !== x) {
      cellTones[x] = 'compare'
      nodeTones[x] = 'compare'
      const grandparent = parent[parent[x]]
      if (parent[x] !== grandparent) {
        shortened.push(`parent[${x}] = ${grandparent}`)
        parent[x] = grandparent
        cellTones[x] = 'active'
      }
      x = parent[x]
      walked.push(x)
    }
    cellTones[x] = 'compare'
    nodeTones[x] = 'compare'
    nodeTones[start] = 'active'
    const walk =
      walked.length === 1
        ? `${start} is its own parent, so ${start} is the root of its group.`
        : `Follow parent links ${walked.join(' → ')}. ${x} is its own parent, so it is the root.`
    const halving =
      shortened.length > 0
        ? ` On the way, ${shortened.join(' and ')} skips a level so the next walk is shorter.`
        : ''
    snapshot(
      walked.length === 1 ? [line, 5, 9] : [line, 5, 6, 7, 9],
      `find(${start}): ${walk}${halving}`,
      {},
      current
    )
    return x
  }

  snapshot(
    [2, 3, 11],
    `Each of the ${n} nodes starts alone in its own group, with parent[i] = i, so there are ${n} components.`
  )

  pairs.forEach(([a, b], i) => {
    let rootA = find(a, 13, i)
    let rootB = find(b, 14, i)
    nodeTones[a] = nodeTones[b] = 'active'
    if (rootA === rootB) {
      edgeTones[i] = 'muted'
      snapshot(
        [15],
        `${a} and ${b} both lead to root ${rootA}, so they are already in the same group. This pair adds nothing and is skipped.`
      )
      return
    }
    if (size[rootA] < size[rootB]) [rootA, rootB] = [rootB, rootA]
    const sizes = { [`size of ${rootA}`]: size[rootA], [`size of ${rootB}`]: size[rootB] }
    const plural = (count: number): string => `${count} ${count === 1 ? 'node' : 'nodes'}`
    const note =
      size[rootA] === size[rootB]
        ? `Different roots, so merge. Both groups have ${plural(size[rootA])}, so either root can go on top: parent[${rootB}] = ${rootA}.`
        : `Different roots, so merge. Root ${rootA}'s group has ${plural(size[rootA])} and root ${rootB}'s has ${plural(size[rootB])}, so parent[${rootB}] = ${rootA} hangs the smaller under the larger, which keeps walks short.`
    parent[rootB] = rootA
    size[rootA] += size[rootB]
    components--
    edgeTones[i] = 'good'
    cellTones[rootB] = 'active'
    snapshot(
      [16, 17, 18, 19],
      `${note} ${components} ${components === 1 ? 'component remains' : 'components remain'}.`,
      sizes
    )
  })

  snapshot(
    [21],
    `Every pair is processed. Each merge joined two groups and lowered the count by one, so ${components} ${components === 1 ? 'component remains' : 'components remain'}.`,
    { answer: components }
  )
  return steps
}

export const unionFind: Pattern = {
  id: 'union-find',
  title: 'Union find',
  group: 'Trees and graphs',
  tagline: 'Keep groups as little trees of parent links and merge them by their roots.',
  problem:
    'Given n nodes numbered from 0 and a list of pairs that are connected, count how many separate groups (connected components) there are.',
  signals: [
    'Connections arrive one at a time and you keep asking whether two things are already linked.',
    'The problem counts groups, islands, friend circles or networks.',
    'You need to spot the first edge that closes a loop in an undirected graph.'
  ],
  idea: `Give every group a representative, its root. Each node stores a parent, and following parents always ends at the root, where a node is its own parent. Two nodes are in the same group exactly when they reach the same root.

To join two groups, find both roots and point one at the other. Hang the smaller group under the larger so the trees stay flat. Every successful join turns two components into one, so the count drops by one; a pair whose ends already share a root changes nothing.

While walking up during a find, point each node at its grandparent. This path compression makes later walks shorter and keeps every operation close to constant time.`,
  complexity: {
    time: 'O((n + m) α(n))',
    space: 'O(n)',
    why: 'With union by size and path compression each find takes almost constant time (α grows so slowly it stays below 5 in practice), and there are two finds per pair. The parent and size arrays hold one entry per node.'
  },
  mistakes: [
    'Linking the two nodes directly, parent[a] = b, instead of linking their roots, which splits groups apart.',
    'Comparing parent[a] and parent[b] to test whether two nodes are connected, instead of comparing their roots.',
    'Lowering the component count for every pair, even when both ends already had the same root.'
  ],
  code,
  inputs: [
    { name: 'n', label: 'Number of nodes', help: '2 to 8, numbered from 0' },
    {
      name: 'pairs',
      label: 'Connected pairs',
      help: 'Up to 10 pairs like 0-1, separated by commas'
    }
  ],
  presets: [
    { label: 'Two groups', values: { n: '7', pairs: '0-1, 2-3, 1-3, 4-5, 3-0, 5-6, 6-4' } },
    { label: 'Everything connected', values: { n: '4', pairs: '0-1, 1-2, 2-3, 3-0, 1-3' } },
    { label: 'Mostly alone', values: { n: '6', pairs: '2-4' } }
  ],
  build
}
