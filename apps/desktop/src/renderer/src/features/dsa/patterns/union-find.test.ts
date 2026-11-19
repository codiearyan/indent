import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { unionFind } from './union-find'

// Flood fill from every unseen node and count how many fills it takes.
function components(n: number, pairs: [number, number][]): number {
  const seen = new Set<number>()
  let count = 0
  for (let start = 0; start < n; start++) {
    if (seen.has(start)) continue
    count++
    const todo = [start]
    seen.add(start)
    while (todo.length > 0) {
      const node = todo.pop() as number
      for (const [a, b] of pairs) {
        const other = a === node ? b : b === node ? a : -1
        if (other >= 0 && !seen.has(other)) {
          seen.add(other)
          todo.push(other)
        }
      }
    }
  }
  return count
}

const parsePairs = (raw: string): [number, number][] =>
  raw.split(',').map((part) => part.trim().split('-').map(Number) as [number, number])

describe('union find', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(unionFind)
  })

  it('answers the presets like a flood fill', () => {
    for (const preset of unionFind.presets) {
      const { n, pairs } = preset.values
      const answer = unionFind.build(preset.values).at(-1)?.vars?.answer
      expect(answer, preset.label).toBe(components(Number(n), parsePairs(pairs)))
    }
  })

  it('agrees with a flood fill on generated pairs', () => {
    let seed = 3
    const next = (limit: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % limit
    }
    for (let round = 0; round < 300; round++) {
      const n = 2 + next(7)
      const keys = new Set<string>()
      const pairs: [number, number][] = []
      for (let tries = 1 + next(10); tries > 0; tries--) {
        const [a, b] = [next(n), next(n)]
        if (a === b || keys.has(`${a}-${b}`) || keys.has(`${b}-${a}`)) continue
        keys.add(`${a}-${b}`)
        pairs.push([a, b])
      }
      if (pairs.length === 0) continue
      const raw = pairs.map(([a, b]) => `${a}-${b}`).join(', ')
      const answer = unionFind.build({ n: String(n), pairs: raw }).at(-1)?.vars?.answer
      expect(answer, `${n}: ${raw}`).toBe(components(n, pairs))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => unionFind.build({ n: '1', pairs: '0-0' })).toThrow(/between 2 and 8/)
    expect(() => unionFind.build({ n: '4', pairs: '0-5' })).toThrow(/0 to 3/)
    expect(() => unionFind.build({ n: '4', pairs: '0 1' })).toThrow(/like 0-1/)
    expect(() => unionFind.build({ n: '4', pairs: '' })).toThrow(/at least one/)
    expect(() => unionFind.build({ n: '4', pairs: '2-2' })).toThrow(/different/)
    expect(() => unionFind.build({ n: '4', pairs: '0-1, 1-0' })).toThrow(/twice/)
  })
})
