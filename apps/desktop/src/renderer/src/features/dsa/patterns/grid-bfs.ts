import type { Pattern, Step, Tone } from '../types'

const code = `function shortestPath(grid: string[]): number {
  const rows = grid.length
  const cols = grid[0].length
  const dist = grid.map((row) => Array<number>(row.length).fill(-1))
  const queue: [number, number][] = [[0, 0]]
  dist[0][0] = 0
  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    if (r === rows - 1 && c === cols - 1) return dist[r][c]
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
      if (grid[nr][nc] === '#' || dist[nr][nc] !== -1) continue
      dist[nr][nc] = dist[r][c] + 1
      queue.push([nr, nc])
    }
  }
  return -1
}`

const MAX = 6
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
]

function parseMaze(raw: string): string[] {
  const grid = raw.split('/').map((row) => row.trim())
  if (grid.length > MAX || grid.some((row) => row.length === 0)) {
    throw new Error(`The maze must have 1 to ${MAX} rows, each separated by a slash.`)
  }
  if (grid.some((row) => /[^.#]/.test(row))) {
    throw new Error('The maze can contain only . for open cells and # for walls.')
  }
  if (grid.some((row) => row.length !== grid[0].length)) {
    throw new Error('Every row of the maze must be the same length.')
  }
  if (grid[0].length > MAX) throw new Error(`Each row can be at most ${MAX} cells long.`)
  if (grid[0][0] === '#')
    throw new Error('The top-left cell must be open, since the path starts there.')
  if (grid.at(-1)?.at(-1) === '#') {
    throw new Error('The bottom-right cell must be open, since the path ends there.')
  }
  return grid
}

function build(values: Record<string, string>): Step[] {
  const grid = parseMaze(values.grid)
  const rows = grid.length
  const cols = grid[0].length
  const dist = grid.map((row) => Array<number>(row.length).fill(-1))
  const queue: [number, number][] = [[0, 0]]
  const steps: Step[] = []
  let current: [number, number] | undefined
  let path: [number, number][] = []
  dist[0][0] = 0

  const cell = ([r, c]: [number, number]): string => `(${r}, ${c})`

  const snapshot = (lines: number[], note: string, vars: Record<string, string | number>): void => {
    const tones: Record<string, Tone> = {}
    for (const [r, c] of queue) tones[`${r},${c}`] = 'compare'
    if (current) tones[`${current[0]},${current[1]}`] = 'active'
    for (const [r, c] of path) tones[`${r},${c}`] = 'good'
    steps.push({
      frames: [
        {
          kind: 'grid',
          label: 'maze',
          cells: grid.map((row, r) =>
            [...row].map((wall, c) => (wall === '#' ? '#' : dist[r][c] === -1 ? '' : dist[r][c]))
          ),
          rowLabels: grid.map((_, r) => String(r)),
          colLabels: [...grid[0]].map((_, c) => String(c)),
          tones
        },
        {
          kind: 'bucket',
          label: 'queue',
          shape: 'queue',
          items: queue.map(([r, c]) => ({ key: `${r},${c}`, value: `${r},${c}` }))
        }
      ],
      vars,
      lines,
      note
    })
  }

  snapshot(
    [4, 5, 6],
    'The start (0, 0) is 0 moves away, so it gets distance 0 and goes in the queue. Every other cell starts with no distance.',
    {}
  )

  while (queue.length > 0) {
    current = queue.shift() as [number, number]
    const [r, c] = current
    const d = dist[r][c]
    if (r === rows - 1 && c === cols - 1) {
      snapshot(
        [8, 9],
        `Take ${cell(current)} from the front. It is the bottom-right corner, and cells leave the queue in order of distance, so ${d} is the fewest moves.`,
        { dist: d }
      )
      path = [current]
      while (dist[path[0][0]][path[0][1]] > 0) {
        const [pr, pc] = path[0]
        const back = DIRECTIONS.map(([dr, dc]): [number, number] => [pr + dr, pc + dc]).find(
          ([nr, nc]) => dist[nr]?.[nc] === dist[pr][pc] - 1
        ) as [number, number]
        path.unshift(back)
      }
      current = undefined
      snapshot(
        [9],
        d === 0
          ? 'The start is already the bottom-right corner, so the shortest path takes 0 moves.'
          : `The shortest path takes ${d} ${d === 1 ? 'move' : 'moves'}. Walking back from the corner, always to a neighbour one move closer to the start, traces one such path.`,
        { answer: d }
      )
      return steps
    }
    snapshot(
      [8, 9],
      `Take ${cell(current)} from the front of the queue. It is ${d} ${d === 1 ? 'move' : 'moves'} from the start and is not the goal, so look at its four neighbours.`,
      { dist: d }
    )

    const added: [number, number][] = []
    for (const [dr, dc] of DIRECTIONS) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
      if (grid[nr][nc] === '#' || dist[nr][nc] !== -1) continue
      dist[nr][nc] = d + 1
      queue.push([nr, nc])
      added.push([nr, nc])
    }
    snapshot(
      [10, 11, 12, 13, 14, 15, 16],
      added.length === 0
        ? `No new cells from ${cell(current)}: each neighbour is a wall, off the edge, or already has a distance, and a first visit is always the shortest.`
        : `${added.map(cell).join(' and ')} ${added.length === 1 ? 'gets' : 'get'} distance ${d + 1} and ${added.length === 1 ? 'joins' : 'join'} the back of the queue. Walls and cells that already have a distance are skipped.`,
      { dist: d }
    )
  }

  current = undefined
  snapshot(
    [19],
    'The queue ran empty without reaching the bottom-right corner. Walls cut it off from the start, so there is no path and the answer is -1.',
    { answer: -1 }
  )
  return steps
}

export const gridBfs: Pattern = {
  id: 'grid-bfs',
  title: 'Shortest path in a grid',
  group: 'Trees and graphs',
  tagline: 'Spread out from the start one ring at a time, so the first arrival is the shortest.',
  problem:
    'Given a small maze of open cells and walls, find the fewest moves from the top-left to the bottom-right corner, moving up, down, left or right. Return -1 if there is no way through.',
  signals: [
    'The input is a grid, and you can step between neighbouring cells.',
    'The question asks for the fewest moves, steps or minutes, and every move costs the same.',
    'Something spreads out from one or more starting cells, like rot, fire or water.'
  ],
  idea: `Treat each open cell as a node and each move as an edge of cost 1. A queue processes cells in the order they were found, so every cell at distance 1 is handled before any cell at distance 2, and so on. The search grows outward in rings around the start.

That order is what makes the answer correct: the first time a cell gets a distance, it is the smallest distance it can have. So you mark a cell as soon as it joins the queue and never touch it again, and the moment the goal leaves the queue you can stop.`,
  complexity: {
    time: 'O(rows × cols)',
    space: 'O(rows × cols)',
    why: 'Each cell joins the queue at most once and checks four neighbours. The distance table has one entry per cell, and the queue can hold a large part of the grid at once.'
  },
  mistakes: [
    'Marking a cell as visited when it leaves the queue instead of when it joins, so the same cell is added many times.',
    'Using depth first search, which finds a path but not necessarily the shortest one.',
    'Checking the bounds after reading grid[nr][nc], which reads outside the grid.'
  ],
  code,
  inputs: [
    {
      name: 'grid',
      label: 'Maze',
      help: 'Rows of . (open) and # (wall) separated by /, up to 6 by 6'
    }
  ],
  presets: [
    { label: 'Maze with walls', values: { grid: '...#./.#.../.#.#./...#./##...' } },
    { label: 'No way through', values: { grid: '..#/.#./#..' } },
    { label: 'Open field', values: { grid: '..../..../....' } },
    { label: 'Single cell', values: { grid: '.' } }
  ],
  build
}
