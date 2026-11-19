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
  throw new Error('Not implemented')
}

export function upperBound<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  throw new Error('Not implemented')
}
