import type { GraphFrame, Pattern, Step, Tone } from '../types'

const code = `function topoSort(nodes: string[], edges: [string, string][]): string[] | null {
  const indegree: Record<string, number> = {}
  const next: Record<string, string[]> = {}
  for (const node of nodes) {
    indegree[node] = 0
    next[node] = []
  }
  for (const [from, to] of edges) {
    next[from].push(to)
    indegree[to]++
  }
  const queue = nodes.filter((node) => indegree[node] === 0)
  const order: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    order.push(node)
    for (const child of next[node]) {
      indegree[child]--
      if (indegree[child] === 0) queue.push(child)
    }
  }
  return order.length === nodes.length ? order : null
}`

type Edge = [string, string]

const MAX_NODES = 7
const MAX_EDGES = 12

function parseEdges(raw: string): { nodes: string[]; edges: Edge[] } {
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) throw new Error('List at least one prerequisite, such as A>B.')
  if (parts.length > MAX_EDGES) throw new Error(`Use at most ${MAX_EDGES} prerequisites.`)
  const edges = parts.map((part): Edge => {
    const match = /^([A-Za-z0-9]{1,3})\s*>\s*([A-Za-z0-9]{1,3})$/.exec(part)
    if (!match) {
      throw new Error(`"${part}" should look like A>B, meaning A has to happen before B.`)
    }
    if (match[1] === match[2]) {
      throw new Error(`A task cannot come before itself, but ${part} says ${match[1]} does.`)
    }
    return [match[1], match[2]]
  })
  const seen = new Set<string>()
  for (const [from, to] of edges) {
    if (seen.has(`${from}>${to}`))
      throw new Error(`The prerequisite ${from}>${to} is listed twice.`)
    seen.add(`${from}>${to}`)
  }
  const nodes = [...new Set(edges.flat())]
  if (nodes.length > MAX_NODES) throw new Error(`Use at most ${MAX_NODES} different tasks.`)
  return { nodes, edges }
}

// Columns by longest path from a start, ignoring the edges that close a cycle, then each column
// sorted by where its parents sit so that edges rarely cross.
function layout(nodes: string[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const state = new Map<string, 'open' | 'done'>()
  const finished: string[] = []
  const forward: Edge[] = []
  const visit = (node: string): void => {
    state.set(node, 'open')
    for (const [from, to] of edges) {
      if (from !== node || state.get(to) === 'open') continue
      forward.push([from, to])
      if (!state.has(to)) visit(to)
    }
    state.set(node, 'done')
    finished.push(node)
  }
  nodes.forEach((node) => state.has(node) || visit(node))

  const layer = new Map(nodes.map((node) => [node, 0]))
  for (const node of finished.reverse()) {
    for (const [from, to] of forward) {
      if (from === node) layer.set(to, Math.max(layer.get(to) ?? 0, (layer.get(node) ?? 0) + 1))
    }
  }

  const layers = Math.max(...layer.values()) + 1
  const positions = new Map<string, { x: number; y: number }>()
  for (let col = 0; col < layers; col++) {
    const parentY = (node: string): number => {
      const ys = edges
        .filter(([, to]) => to === node)
        .flatMap(([from]) => positions.get(from)?.y ?? [])
      return ys.length === 0 ? 0.5 : ys.reduce((a, b) => a + b, 0) / ys.length
    }
    const column = nodes
      .filter((node) => layer.get(node) === col)
      .sort((a, b) => parentY(a) - parentY(b))
    column.forEach((node, i) => {
      positions.set(node, {
        x: layers === 1 ? 0.5 : 0.08 + (0.84 * col) / (layers - 1),
        y: column.length === 1 ? 0.5 : 0.12 + (0.76 * i) / (column.length - 1)
      })
    })
  }
  return positions
}

function build(values: Record<string, string>): Step[] {
  const { nodes, edges } = parseEdges(values.edges)
  const positions = layout(nodes, edges)
  const indegree: Record<string, number> = Object.fromEntries(nodes.map((node) => [node, 0]))
  const steps: Step[] = []
  const queue: string[] = []
  const order: string[] = []
  const used = new Set<number>()
  let nodeTones: Record<string, Tone> = {}
  let edgeTones: Record<number, Tone> = {}

  const snapshot = (lines: number[], note: string, vars: Record<string, string | number>): void => {
    const graph: GraphFrame = {
      kind: 'graph',
      label: 'tasks',
      directed: true,
      nodes: nodes.map((node) => ({
        id: node,
        label: node,
        ...(positions.get(node) as { x: number; y: number }),
        badge: String(indegree[node]),
        tone: nodeTones[node] ?? (order.includes(node) ? 'good' : undefined)
      })),
      edges: edges.map(([from, to], i) => ({
        from,
        to,
        tone: edgeTones[i] ?? (used.has(i) ? 'muted' : undefined)
      }))
    }
    steps.push({
      frames: [
        graph,
        {
          kind: 'bucket',
          label: 'ready queue',
          shape: 'queue',
          items: queue.map((node) => ({ key: node, value: node }))
        },
        {
          kind: 'array',
          label: 'order',
          values: nodes.map((_, i) => order[i] ?? ''),
          keys: nodes.map((_, i) => order[i] ?? `empty-${i}`),
          tones: Object.fromEntries(order.map((_, i) => [i, 'good']))
        }
      ],
      vars,
      lines,
      note
    })
    nodeTones = {}
    edgeTones = {}
  }

  snapshot(
    [2, 3, 4, 5, 6, 7],
    `There are ${nodes.length} tasks. The badge on each one is its indegree: how many tasks must finish before it can start. Nothing is counted yet, so all are 0.`,
    {}
  )

  edges.forEach(([from, to], i) => {
    indegree[to]++
    edgeTones[i] = 'active'
    nodeTones[to] = 'compare'
    snapshot(
      [8, 9, 10],
      `${from}>${to} means ${to} has to wait for ${from}, so ${to}'s indegree goes up to ${indegree[to]}.`,
      {}
    )
  })

  queue.push(...nodes.filter((node) => indegree[node] === 0))
  for (const node of queue) nodeTones[node] = 'compare'
  snapshot(
    [12, 13],
    queue.length === 0
      ? 'No task has indegree 0, so nothing can start. Every task waits on another one.'
      : `${queue.join(', ')} ${queue.length === 1 ? 'has' : 'have'} indegree 0: nothing has to come first, so ${queue.length === 1 ? 'it starts' : 'they start'} the ready queue.`,
    { ready: queue.length }
  )

  while (queue.length > 0) {
    const node = queue.shift() as string
    order.push(node)
    nodeTones[node] = 'active'
    const children = edges.flatMap(([from, to], i) => (from === node ? [{ to, i }] : []))
    snapshot(
      [15, 16],
      children.length === 0
        ? `Take ${node} from the queue and place it next in the order. Nothing waits on ${node}, so no indegree changes.`
        : `Take ${node} from the queue and place it next in the order. Now that ${node} is done, the tasks waiting on it each lose one prerequisite.`,
      { placed: order.length }
    )
    for (const { to, i } of children) {
      indegree[to]--
      used.add(i)
      edgeTones[i] = 'active'
      nodeTones[node] = 'active'
      nodeTones[to] = indegree[to] === 0 ? 'good' : 'compare'
      if (indegree[to] === 0) queue.push(to)
      snapshot(
        [17, 18, 19],
        indegree[to] === 0
          ? `${to}'s indegree drops to 0: everything it needed is placed, so it joins the ready queue.`
          : `${to}'s indegree drops to ${indegree[to]}. It still waits on ${indegree[to]} more ${indegree[to] === 1 ? 'task' : 'tasks'}, so it stays out of the queue.`,
        { placed: order.length }
      )
    }
  }

  if (order.length === nodes.length) {
    snapshot(
      [22],
      `All ${nodes.length} tasks are placed and every task came after the ones it needs, so ${order.join(', ')} is a valid order.`,
      { placed: order.length, answer: order.join(', ') }
    )
    return steps
  }

  const stuck = nodes.filter((node) => !order.includes(node))
  for (const node of stuck) nodeTones[node] = 'bad'
  edges.forEach(([from, to], i) => {
    if (stuck.includes(from) && stuck.includes(to)) edgeTones[i] = 'bad'
  })
  snapshot(
    [22],
    `The queue is empty but only ${order.length} of ${nodes.length} tasks are placed. ${stuck.join(', ')} are stuck behind a loop of tasks that wait on each other, called a cycle, so no order exists.`,
    { placed: order.length, answer: 'cycle' }
  )
  return steps
}

export const topologicalSort: Pattern = {
  id: 'topological-sort',
  title: 'Topological sort',
  group: 'Trees and graphs',
  tagline:
    'Order tasks so every prerequisite comes first, by repeatedly taking a task nothing blocks.',
  problem:
    'Given tasks and pairs like A>B (A must happen before B), find an order that does every task after all of its prerequisites, or report that a cycle makes it impossible.',
  signals: [
    'The input is a list of dependencies: courses and prerequisites, build steps, package installs.',
    'You are asked for any valid order, or whether finishing everything is possible at all.',
    'The relationships have a direction, and a loop among them would make the task impossible.'
  ],
  idea: `Count, for every task, how many tasks must come before it. That count is its indegree. A task with indegree 0 is free to go right now, so put all of those in a queue.

Take a task from the queue and add it to the order. Every task that was waiting on it now has one fewer thing to wait for, so lower their counts. Any count that hits 0 means that task just became free, and it joins the queue.

If the queue runs out before every task is placed, the leftovers are all waiting on each other. That is a cycle, and no order can satisfy it.`,
  complexity: {
    time: 'O(V + E)',
    space: 'O(V + E)',
    why: 'Each task enters the queue once and each prerequisite is counted once and lowered once. The lists of who waits on whom hold one entry per prerequisite.'
  },
  mistakes: [
    'Returning the order without checking that its length matches the number of tasks, which hides a cycle.',
    'Pointing the edges the wrong way, so tasks come out after the ones that depend on them.',
    'Forgetting tasks that appear in no prerequisite at all; they still need indegree 0 and a place in the order.'
  ],
  code,
  inputs: [
    {
      name: 'edges',
      label: 'Prerequisites',
      help: 'Pairs like A>B (A before B), separated by commas. Up to 7 tasks and 12 pairs'
    }
  ],
  presets: [
    { label: 'Build steps', values: { edges: 'A>B, A>C, B>D, C>D, D>E, C>F, F>E' } },
    { label: 'A cycle', values: { edges: 'A>B, B>C, C>D, D>B, A>E' } },
    { label: 'One long chain', values: { edges: 'A>B, B>C, C>D' } },
    { label: 'Several starts', values: { edges: 'A>D, B>D, C>D, D>E' } }
  ],
  build
}
