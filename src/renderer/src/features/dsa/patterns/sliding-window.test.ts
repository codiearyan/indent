import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { slidingWindow } from './sliding-window'

function longestUnique(s: string): number {
  let best = 0
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      const part = s.slice(i, j + 1)
      if (new Set(part).size === part.length) best = Math.max(best, part.length)
    }
  }
  return best
}

function allStrings(alphabet: string, maxLength: number): string[] {
  let level = ['']
  const all: string[] = []
  for (let length = 1; length <= maxLength; length++) {
    level = level.flatMap((prefix) => [...alphabet].map((c) => prefix + c))
    all.push(...level)
  }
  return all
}

describe('sliding window', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(slidingWindow)
  })

  it('agrees with checking every substring', () => {
    const inputs = [
      ...slidingWindow.presets.map((preset) => preset.values.s),
      ...allStrings('abc', 5),
      'pwwkew',
      'dvdfabcdefgxa'
    ]
    for (const s of inputs) {
      const answer = slidingWindow.build({ s }).at(-1)?.vars?.answer
      expect(answer, s).toBe(longestUnique(s.trim()))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => slidingWindow.build({ s: '' })).toThrow(/characters long/)
    expect(() => slidingWindow.build({ s: 'abcdefghijklmnop' })).toThrow(/characters long/)
  })
})
