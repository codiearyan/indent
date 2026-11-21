import { describe, expect, it } from 'vitest'
import type { ProgressState } from '../../../../shared/types'
import { momentFrom } from './moments'

const state = (
  totalPoints: number,
  milestones: ProgressState['milestones'] = {}
): ProgressState => ({
  chapters: {},
  activity: {},
  totalPoints,
  milestones
})

describe('momentFrom', () => {
  it('has nothing to show when no level or milestone was reached', () => {
    expect(momentFrom(state(10), state(30))).toBeNull()
  })

  it('shows a new level with where the meter started', () => {
    expect(momentFrom(state(250), state(310))).toEqual({
      level: { level: 3, from: 150 / 200 },
      milestones: [],
      burst: 'medium'
    })
  })

  it('puts a level and its milestones in one moment, sized by the biggest', () => {
    const before = state(90, { 'first-task': '2026-11-01', 'streak-7': '2026-11-10' })
    const after = state(110, {
      'first-task': '2026-11-01',
      'streak-7': '2026-11-10',
      'first-issue': '2026-11-22',
      'streak-30': '2026-11-22'
    })
    expect(momentFrom(before, after)).toEqual({
      level: { level: 2, from: 0.9 },
      milestones: ['first-issue', 'streak-30'],
      burst: 'large'
    })
  })

  it('leaves the repo milestones to the repo view', () => {
    const after = state(0, { 'first-repo': '2026-11-22', roadmap: '2026-11-22' })
    expect(momentFrom(state(0), after)).toBeNull()
  })
})
