import { describe, expect, it } from 'vitest'
import { levelFor } from '../../../../shared/rules'
import { levelRows } from './levels'

describe('levelRows', () => {
  it('starts at level 1 for a new learner', () => {
    expect(levelRows(1)).toEqual([
      { level: 1, start: 0 },
      { level: 2, start: 100 },
      { level: 3, start: 300 },
      { level: 4, start: 600 }
    ])
  })

  it('shows the level before and the next three', () => {
    expect(levelRows(5).map((row) => row.level)).toEqual([4, 5, 6, 7, 8])
  })

  it('starts each level where levelFor puts it', () => {
    for (const { level, start } of levelRows(7)) {
      expect(levelFor(start).level).toBe(level)
      if (start > 0) expect(levelFor(start - 1).level).toBe(level - 1)
    }
  })
})
