import type { Pattern } from './types'
import { twoPointers } from './patterns/two-pointers'

/** Every pattern, in the order the index page shows them inside each group. */
export const patterns: Pattern[] = [twoPointers]

export function findPattern(id: string | undefined): Pattern | undefined {
  return patterns.find((pattern) => pattern.id === id)
}
