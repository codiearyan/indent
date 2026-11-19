import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { mergeIntervals } from './merge-intervals'

// Marks every covered point on a doubled number line, so 1-2 and 3-4 stay apart but 1-2 and 2-3 join.
function mergeByCoverage(intervals: [number, number][]): string {
  const covered: boolean[] = []
  for (const [start, end] of intervals) {
    for (let x = start * 2; x <= end * 2; x++) covered[x] = true
  }
  const runs: string[] = []
  for (let x = 0; x < covered.length; x++) {
    if (!covered[x] || covered[x - 1]) continue
    let end = x
    while (covered[end + 1]) end++
    runs.push(`${x / 2}-${end / 2}`)
  }
  return runs.join(', ')
}

describe('merge intervals', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(mergeIntervals)
  })

  it('agrees with marking every covered point', () => {
    const pool: [number, number][] = [
      [0, 1],
      [0, 3],
      [1, 2],
      [2, 4],
      [3, 3],
      [4, 6],
      [5, 5]
    ]
    const lists: [number, number][][] = [
      [
        [1, 3],
        [8, 10],
        [2, 6],
        [15, 18],
        [9, 12],
        [17, 20]
      ]
    ]
    for (const a of pool) {
      lists.push([a])
      for (const b of pool) {
        lists.push([a, b])
        for (const c of pool) lists.push([a, b, c])
      }
    }
    for (const list of lists) {
      const raw = list.map(([start, end]) => `${start}-${end}`).join(', ')
      const answer = mergeIntervals.build({ intervals: raw }).at(-1)?.vars?.answer
      expect(answer, raw).toBe(mergeByCoverage(list))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => mergeIntervals.build({ intervals: '' })).toThrow(/1 to 10/)
    expect(() => mergeIntervals.build({ intervals: '1-3, 5' })).toThrow(/start-end/)
    expect(() => mergeIntervals.build({ intervals: '6-2' })).toThrow(/after the end/)
    expect(() => mergeIntervals.build({ intervals: '1-300' })).toThrow(/0 and 99/)
  })
})
