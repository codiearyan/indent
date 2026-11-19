import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import type { IntervalsFrame } from '../types'
import { greedyIntervals } from './greedy-intervals'

type Interval = [number, number]

function overlap(a: Interval, b: Interval): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

function bestCount(intervals: Interval[]): number {
  let best = 0
  for (let mask = 0; mask < 1 << intervals.length; mask++) {
    const picked = intervals.filter((_, i) => mask & (1 << i))
    const fine = picked.every((a, i) => picked.every((b, j) => i === j || !overlap(a, b)))
    if (fine) best = Math.max(best, picked.length)
  }
  return best
}

function generated(): Interval[][] {
  const cases: Interval[][] = []
  for (let length = 1; length <= 8; length++) {
    for (let seed = 1; seed <= 6; seed++) {
      cases.push(
        Array.from({ length }, (_, i) => {
          const start = (i * seed * 3 + seed) % 10
          return [start, start + 1 + ((i + seed) % 4)]
        })
      )
    }
  }
  return cases
}

describe('greedy intervals', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(greedyIntervals)
  })

  it('agrees with trying every subset', () => {
    for (const intervals of generated()) {
      const text = intervals.map(([a, b]) => `${a}-${b}`).join(', ')
      const steps = greedyIntervals.build({ intervals: text })
      expect(steps.at(-1)?.vars?.answer, text).toBe(bestCount(intervals))

      const last = steps.at(-1)?.frames[0] as IntervalsFrame
      const taken = last.items.filter((item) => item.tone === 'good')
      expect(taken.length, text).toBe(bestCount(intervals))
      expect(
        last.items.every((item) => item.tone === 'good' || item.tone === 'bad'),
        text
      ).toBe(true)
      for (const a of taken) {
        for (const b of taken) {
          if (a !== b) expect(overlap([a.start, a.end], [b.start, b.end]), text).toBe(false)
        }
      }
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => greedyIntervals.build({ intervals: '1-4, 3' })).toThrow(/dash/)
    expect(() => greedyIntervals.build({ intervals: '5-2' })).toThrow(/before/)
    expect(() => greedyIntervals.build({ intervals: '' })).toThrow(/interval/)
  })
})
