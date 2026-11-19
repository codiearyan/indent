// Task 3: Search a rotated sorted array
//
// items held distinct values in sorted order, then was rotated: some prefix was moved to the end,
// for example [1, 3, 5, 7, 9] became [7, 9, 1, 3, 5]. The rotation can be 0.
// - searchRotated(items, target, compare?) returns the index of target, or -1 when it is absent.
// compare may be called with any two values (items or target). The search must use O(log n)
// comparisons: the check counts calls to compare on a million items.
import { natural, type Compare } from './compare.ts'

export function searchRotated<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  throw new Error('Not implemented')
}
