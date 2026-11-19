import type { Pattern } from './types'
import { backtracking } from './patterns/backtracking'
import { binarySearch } from './patterns/binary-search'
import { dp1d } from './patterns/dp-1d'
import { dp2d } from './patterns/dp-2d'
import { fastSlowPointers } from './patterns/fast-slow-pointers'
import { greedyIntervals } from './patterns/greedy-intervals'
import { gridBfs } from './patterns/grid-bfs'
import { linkedListReversal } from './patterns/linked-list-reversal'
import { mergeIntervals } from './patterns/merge-intervals'
import { monotonicStack } from './patterns/monotonic-stack'
import { prefixSums } from './patterns/prefix-sums'
import { slidingWindow } from './patterns/sliding-window'
import { topKHeap } from './patterns/top-k-heap'
import { topologicalSort } from './patterns/topological-sort'
import { treeBfs } from './patterns/tree-bfs'
import { treeDfs } from './patterns/tree-dfs'
import { twoPointers } from './patterns/two-pointers'
import { unionFind } from './patterns/union-find'

/** Every pattern, in the order the index page shows them inside each group. */
export const patterns: Pattern[] = [
  twoPointers,
  slidingWindow,
  binarySearch,
  prefixSums,
  monotonicStack,
  mergeIntervals,
  fastSlowPointers,
  linkedListReversal,
  topKHeap,
  greedyIntervals,
  treeBfs,
  treeDfs,
  gridBfs,
  topologicalSort,
  unionFind,
  backtracking,
  dp1d,
  dp2d
]

export function findPattern(id: string | undefined): Pattern | undefined {
  return patterns.find((pattern) => pattern.id === id)
}
