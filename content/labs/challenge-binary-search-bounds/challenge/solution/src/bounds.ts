// Task 1: Lower and upper bound
//
// items is sorted by compare and may contain duplicates. compare is always called as
// compare(items[i], target).
// - lowerBound(items, target, compare?) is the first index whose item is not before target:
//   the first i with compare(items[i], target) >= 0, or items.length when there is none.
// - upperBound(items, target, compare?) is the first index whose item is after target:
//   the first i with compare(items[i], target) > 0, or items.length when there is none.
// Both must use O(log n) comparisons: the check counts calls to compare on a million items.
import { natural, type Compare } from './compare.ts'

export function lowerBound<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  return firstIndexWhere(items, (item) => compare(item, target) >= 0)
}

export function upperBound<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  return firstIndexWhere(items, (item) => compare(item, target) > 0)
}

// The items where test is true form a suffix of the array; find where it starts.
function firstIndexWhere<T>(items: readonly T[], test: (item: T) => boolean): number {
  let low = 0
  let high = items.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (test(items[mid])) high = mid
    else low = mid + 1
  }
  return low
}
