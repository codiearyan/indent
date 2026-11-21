import { describe, expect, it } from 'vitest'
import type { DayActivity, ProgressState } from './types'
import {
  DAILY_GOALS,
  DAYS_PER_FREEZE,
  DEFAULT_DAILY_GOAL,
  MAX_FREEZES,
  STREAK_MILESTONES,
  currentStreak,
  daysToFreeze,
  goalFor,
  goalMet,
  localDate,
  milestoneDates,
  walkStreak
} from './rules'

const today = new Date(2026, 10, 22)
const ago = (n: number): string => localDate(new Date(2026, 10, 22 - n))
const day = (tasksPassed: number, extra: Partial<DayActivity> = {}): DayActivity => ({
  points: tasksPassed * 10,
  checks: tasksPassed + 1,
  tasksPassed,
  ...extra
})
/** Days ago (inclusive range) that each passed `tasks` tasks. */
function run(from: number, to: number, tasks = 1): ProgressState['activity'] {
  const activity: ProgressState['activity'] = {}
  for (let n = from; n >= to; n--) activity[ago(n)] = day(tasks)
  return activity
}

describe('daily goal', () => {
  it('offers 1, 2 or 3 tasks a day and starts at 1', () => {
    expect(DAILY_GOALS).toEqual([1, 2, 3])
    expect(DEFAULT_DAILY_GOAL).toBe(1)
  })

  it('meets the goal the day was set with, and 1 on days saved before goals', () => {
    expect(goalMet(day(1))).toBe(true)
    expect(goalMet(day(0))).toBe(false)
    expect(goalMet(undefined)).toBe(false)
    expect(goalMet(day(1, { goal: 2 }))).toBe(false)
    expect(goalMet(day(2, { goal: 2 }))).toBe(true)
  })

  it('reads the goal of a day from the day, then from the setting', () => {
    const state = { chapters: {}, totalPoints: 0, activity: { [ago(0)]: day(1, { goal: 3 }) } }
    expect(goalFor(state, today)).toBe(3)
    expect(goalFor({ ...state, dailyGoal: 2 }, new Date(2026, 10, 23))).toBe(2)
    expect(goalFor({ ...state, activity: {} }, today)).toBe(1)
  })
})

describe('streak', () => {
  it('counts only days that met their goal', () => {
    const activity = { ...run(3, 1), [ago(2)]: day(1, { goal: 2 }) }
    expect(currentStreak(activity, today)).toBe(1)
  })

  it('is the same as before for progress saved without goals or freezes', () => {
    const activity = { ...run(9, 6, 3), ...run(4, 0, 1) }
    expect(currentStreak(activity, today)).toBe(5)
  })

  it('bridges a frozen day without counting it', () => {
    const activity = { ...run(5, 3), [ago(2)]: day(0, { frozen: true }), ...run(1, 1) }
    expect(currentStreak(activity, today)).toBe(4)
  })

  it('keeps a streak alive while today is not done yet', () => {
    const activity = { ...run(3, 1), [ago(0)]: day(1, { goal: 2 }) }
    expect(currentStreak(activity, today)).toBe(3)
  })
})

describe('walkStreak', () => {
  it('earns a freeze every 7 days of the streak, holding at most 2', () => {
    expect(DAYS_PER_FREEZE).toBe(7)
    expect(MAX_FREEZES).toBe(2)
    expect(walkStreak(run(5, 0), today).freezes).toBe(0)
    expect(walkStreak(run(6, 0), today).freezes).toBe(1)
    expect(walkStreak(run(13, 0), today).freezes).toBe(2)
    expect(walkStreak(run(30, 0), today).freezes).toBe(2)
  })

  it('spends a freeze on a frozen day and loses them when the streak breaks', () => {
    const frozen = { ...run(10, 3), [ago(2)]: day(0, { frozen: true }), ...run(1, 1) }
    expect(walkStreak(frozen, today).freezes).toBe(0)
    const broken = { ...run(20, 5), ...run(2, 1) }
    expect(walkStreak(broken, today).freezes).toBe(0)
  })

  it('finds the longest streak and the day each streak milestone was reached', () => {
    expect(STREAK_MILESTONES).toEqual([7, 30, 100])
    const walk = walkStreak({ ...run(40, 31), ...run(20, 0) }, today)
    expect(walk.longest).toBe(21)
    expect(walk.reachedOn).toEqual({ 7: ago(34) })
  })

  it('is empty with no activity', () => {
    expect(walkStreak({}, today)).toEqual({ freezes: 0, longest: 0, reachedOn: {} })
  })
})

describe('daysToFreeze', () => {
  it('covers a missed day of a live streak when a freeze is held', () => {
    expect(daysToFreeze({ ...run(10, 2) }, today)).toEqual([ago(1)])
  })

  it('covers several missed days only when the freezes cover all of them', () => {
    expect(daysToFreeze(run(20, 3), today)).toEqual([ago(2), ago(1)])
    expect(daysToFreeze(run(20, 4), today)).toEqual([])
  })

  it('leaves a day that met its goal, today, and a streak with no freezes alone', () => {
    expect(daysToFreeze(run(10, 1), today)).toEqual([])
    expect(daysToFreeze(run(3, 2), today)).toEqual([])
    expect(daysToFreeze({}, today)).toEqual([])
  })

  it('covers a day that passed tasks but fell short of its goal', () => {
    const activity = { ...run(10, 2), [ago(1)]: day(1, { goal: 2 }) }
    expect(daysToFreeze(activity, today)).toEqual([ago(1)])
  })
})

describe('milestoneDates', () => {
  const iso = (n: number): string => new Date(2026, 10, 22 - n, 18).toISOString()
  const chapter = (
    completed?: number,
    passed: number[] = []
  ): ProgressState['chapters'][string] => ({
    nonGreenChecks: 0,
    startedAt: iso(50),
    lastOpenedAt: iso(0),
    tasks: Object.fromEntries(
      passed.map((n, i) => [`t${i}`, { passed: true, pointsEarned: 10, passedAt: iso(n) }])
    ),
    ...(completed === undefined ? {} : { completedAt: iso(completed) })
  })
  const state: ProgressState = {
    totalPoints: 60,
    activity: run(12, 3),
    chapters: {
      'a/one': chapter(9, [12, 9]),
      'a/two': chapter(5, [5]),
      'b/one': chapter(undefined, [4]),
      'c/one': chapter(3, [3])
    }
  }
  const catalog = {
    labs: [
      { id: 'a', chapters: ['one', 'two'] },
      { id: 'b', chapters: ['one'] },
      { id: 'c', chapters: ['one'] }
    ],
    paths: [{ labs: ['a', 'b'] }, { labs: ['a', 'c'] }]
  }

  it('dates each milestone by the day it was reached', () => {
    expect(milestoneDates(state, catalog)).toEqual({
      'first-task': ago(12),
      'first-issue': ago(9),
      'first-repo': ago(5),
      'streak-7': ago(6),
      roadmap: ago(3)
    })
  })

  it('leaves out the repo milestones without the catalog', () => {
    const dates = milestoneDates(state)
    expect(dates['first-repo']).toBeUndefined()
    expect(dates.roadmap).toBeUndefined()
    expect(dates['first-task']).toBe(ago(12))
  })

  it('has none for a new learner', () => {
    expect(milestoneDates({ chapters: {}, activity: {}, totalPoints: 0 }, catalog)).toEqual({})
  })
})
