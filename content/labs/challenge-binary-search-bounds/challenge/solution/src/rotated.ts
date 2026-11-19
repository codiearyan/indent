// Task 3: Search a rotated sorted array
//
// items held distinct values in sorted order, then was rotated: some prefix was moved to the end,
// for example [1, 3, 5, 7, 9] became [7, 9, 1, 3, 5]. The rotation can be 0.
// - searchRotated(items, target, compare?) returns the index of target, or -1 when it is absent.
// compare may be called with any two values (items or target). The search must use O(log n)
// comparisons: the check counts calls to compare on a million items.
import { natural, type Compare } from './compare.ts'

export function searchRotated<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  let low = 0
  let high = items.length - 1
  while (low <= high) {
    const mid = (low + high) >>> 1
    const order = compare(items[mid], target)
    if (order === 0) return mid
    if (compare(items[low], items[mid]) <= 0) {
      // The left half low..mid is sorted.
      if (compare(items[low], target) <= 0 && order > 0) high = mid - 1
      else low = mid + 1
    } else {
      // The right half mid..high is sorted.
      if (order < 0 && compare(target, items[high]) <= 0) low = mid + 1
      else high = mid - 1
    }
  }
  return -1
}
