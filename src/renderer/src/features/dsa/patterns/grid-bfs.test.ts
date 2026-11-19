import { describe, expect, it } from 'vitest'
import { expectValidPattern } from '../testing'
import { gridBfs } from './grid-bfs'

// Relax every open cell from its neighbours until nothing changes.
function shortest(rows: string[]): number {
  const dist = rows.map((row) => [...row].map(() => Infinity))
  dist[0][0] = 0
  for (let pass = 0; pass < 40; pass++) {
    rows.forEach((row, r) => {
      ;[...row].forEach((cell, c) => {
        if (cell === '#') return
        for (const [nr, nc] of [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1]
        ]) {
          const near = dist[nr]?.[nc]
          if (near !== undefined && near + 1 < dist[r][c]) dist[r][c] = near + 1
        }
      })
    })
  }
  const end = dist.at(-1)?.at(-1) ?? Infinity
  return end === Infinity ? -1 : end
}

function mazes(rows: number, cols: number): string[][] {
  const result: string[][] = []
  for (let mask = 0; mask < 1 << (rows * cols); mask++) {
    const wall = (r: number, c: number): boolean => (mask & (1 << (r * cols + c))) !== 0
    if (wall(0, 0) || wall(rows - 1, cols - 1)) continue
    result.push(
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (wall(r, c) ? '#' : '.')).join('')
      )
    )
  }
  return result
}

describe('grid bfs', () => {
  it('has valid metadata and animations for every preset', () => {
    expectValidPattern(gridBfs)
  })

  it('answers the presets like the reference', () => {
    for (const preset of gridBfs.presets) {
      const answer = gridBfs.build(preset.values).at(-1)?.vars?.answer
      expect(answer, preset.label).toBe(shortest(preset.values.grid.split('/')))
    }
  })

  it('agrees with the reference on every small maze', () => {
    for (const rows of [...mazes(3, 3), ...mazes(2, 4), ...mazes(4, 3), ...mazes(1, 5)]) {
      const answer = gridBfs.build({ grid: rows.join('/') }).at(-1)?.vars?.answer
      expect(answer, rows.join('/')).toBe(shortest(rows))
    }
  })

  it('rejects input it cannot animate', () => {
    expect(() => gridBfs.build({ grid: '..#/..' })).toThrow(/same length/)
    expect(() => gridBfs.build({ grid: '#./..' })).toThrow(/top-left/)
    expect(() => gridBfs.build({ grid: '../.#' })).toThrow(/bottom-right/)
    expect(() => gridBfs.build({ grid: '..x' })).toThrow(/only/)
    expect(() => gridBfs.build({ grid: Array(7).fill('..').join('/') })).toThrow(/6/)
  })
})
