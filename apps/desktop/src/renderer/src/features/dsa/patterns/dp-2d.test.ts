import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { dp2d } from './dp-2d'

function isSubsequence(small: string, big: string): boolean {
  let at = 0
  for (const char of big) if (char === small[at]) at++
  return at === small.length
}

function longestByEverySubsequence(a: string, b: string): number {
  let best = 0
  for (let mask = 0; mask < 1 << a.length; mask++) {
    const picked = [...a].filter((_, i) => mask & (1 << i)).join('')
    if (isSubsequence(picked, b)) best = Math.max(best, picked.length)
  }
  return best
}

describe('dp 2d', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(dp2d)
  })

  it('finds a common subsequence as long as any other', () => {
    const pairs = dp2d.presets.map((preset): [string, string] => [preset.values.a, preset.values.b])
    const letters = 'ABCAB'
    for (let n = 1; n <= 7; n++) {
      for (let m = 1; m <= 7; m += 2) {
        const a = Array.from({ length: n }, (_, i) => letters[(i * 2) % 5]).join('')
        const b = Array.from({ length: m }, (_, i) => letters[(i + n) % 5]).join('')
        pairs.push([a, b])
      }
    }
    for (const [a, b] of pairs) {
      const steps = dp2d.build({ a, b })
      expect(steps.length, `${a} ${b}`).toBeLessThanOrEqual(150)
      const answer = JSON.parse(String(steps.at(-1)?.vars?.answer)) as string
      expect(isSubsequence(answer, a) && isSubsequence(answer, b), `${a} ${b}: ${answer}`).toBe(
        true
      )
      expect(answer.length, `${a} ${b}`).toBe(longestByEverySubsequence(a, b))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => dp2d.build({ a: 'ABCDEFGH', b: 'AB' })).toThrow(/characters/)
    expect(() => dp2d.build({ a: 'AB', b: '  ' })).toThrow(/characters/)
  })
})
