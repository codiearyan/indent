// Task 2: Count and insert position
//
// items is sorted by compare and may contain duplicates.
// - countOccurrences(items, target, compare?) is how many items compare equal to target.
// - insertPosition(items, target, compare?) is the index where target can be inserted so items
//   stay sorted, after any items equal to it (so equal items keep their arrival order).
// Both must use O(log n) comparisons, even when half the array equals target. You may import
// from ./bounds.ts.
import { natural, type Compare } from './compare.ts'

export function countOccurrences<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  throw new Error('Not implemented')
}

export function insertPosition<T>(items: readonly T[], target: T, compare: Compare<T> = natural): number {
  throw new Error('Not implemented')
}
