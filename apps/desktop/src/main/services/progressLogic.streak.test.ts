import { describe, expect, it } from 'vitest'
import type { CheckResult, ProgressState, TaskDef } from '../../shared/types'
import { localDate } from '../../shared/rules'
import {
  emptyProgress,
  readProgressFile,
  recordCheck,
  recordMilestones,
  setDailyGoal,
  settleFreezes
} from './progressLogic'

const now = new Date(2026, 10, 22, 10)
const ago = (n: number): string => localDate(new Date(2026, 10, 22 - n))
const task = (id: string): TaskDef => ({
  id,
  title: id,
  file: `src/${id}.ts`,
  description: '',
  nextSteps: [],
  hints: [],
  points: 10
})
const pass = (taskId: string): CheckResult => ({
  taskId,
  passed: true,
  details: [],
  durationMs: 5,
  at: now.toISOString()
})
function streak(from: number, to: number): ProgressState {
  const state = emptyProgress()
  for (let n = from; n >= to; n--)
    state.activity[ago(n)] = { points: 10, checks: 1, tasksPassed: 1 }
  return state
}

describe('daily goal', () => {
  it('stamps the goal on the day a check runs', () => {
    const state = emptyProgress()
    setDailyGoal(state, 2, now)
    recordCheck(state, 'lab', 'ch', [task('t1')], [pass('t1')], now)
    expect(state.dailyGoal).toBe(2)
    expect(state.activity[ago(0)]).toMatchObject({ tasksPassed: 1, goal: 2 })
  })

  it('changes the goal of today when today has activity, and no other day', () => {
    const state = streak(2, 0)
    setDailyGoal(state, 3, now)
    expect(state.activity[ago(0)].goal).toBe(3)
    expect(state.activity[ago(1)].goal).toBeUndefined()
  })

  it('refuses a goal that is not offered', () => {
    expect(() => setDailyGoal(emptyProgress(), 5, now)).toThrow()
    expect(() => setDailyGoal(emptyProgress(), 1.5, now)).toThrow()
  })

  it('leaves days alone while the goal was never set', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'ch', [task('t1')], [pass('t1')], now)
    expect(state.activity[ago(0)].goal).toBeUndefined()
  })
})

describe('settleFreezes', () => {
  it('marks a missed day of a streak that holds a freeze', () => {
    const state = streak(10, 2)
    settleFreezes(state, now)
    expect(state.activity[ago(1)]).toEqual({ points: 0, checks: 0, tasksPassed: 0, frozen: true })
  })

  it('does nothing when the streak has no freeze or is already safe', () => {
    const short = streak(3, 2)
    settleFreezes(short, now)
    expect(short.activity[ago(1)]).toBeUndefined()
    const safe = streak(10, 1)
    settleFreezes(safe, now)
    expect(Object.values(safe.activity).some((day) => day.frozen)).toBe(false)
  })

  it('never takes points away', () => {
    const state = streak(10, 2)
    state.activity[ago(1)] = { points: 10, checks: 2, tasksPassed: 1, goal: 2 }
    state.totalPoints = 100
    settleFreezes(state, now)
    expect(state.activity[ago(1)]).toMatchObject({ points: 10, tasksPassed: 1, frozen: true })
    expect(state.totalPoints).toBe(100)
  })
})

describe('recordMilestones', () => {
  it('records a milestone once, with the day it was reached', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'ch', [task('t1'), task('t2')], [pass('t1')], now)
    recordMilestones(state)
    expect(state.milestones).toEqual({ 'first-task': ago(0) })
    state.milestones = { 'first-task': ago(30) }
    recordMilestones(state)
    expect(state.milestones['first-task']).toBe(ago(30))
  })

  it('records the repo milestones only with the catalog', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'ch', [task('t1')], [pass('t1')], now)
    recordMilestones(state)
    expect(state.milestones?.['first-repo']).toBeUndefined()
    recordMilestones(state, { labs: [{ id: 'lab', chapters: ['ch'] }], paths: [] })
    expect(state.milestones).toMatchObject({ 'first-issue': ago(0), 'first-repo': ago(0) })
  })
})

describe('progress file with the new fields', () => {
  it('reads back the goal, freezes and milestones', () => {
    const state = streak(10, 2)
    settleFreezes(state, now)
    setDailyGoal(state, 2, now)
    state.milestones = { 'streak-7': ago(4) }
    expect(readProgressFile(JSON.stringify(state))).toEqual(state)
  })

  it('refuses a damaged goal or milestone', () => {
    const bad = (extra: object): string => JSON.stringify({ ...emptyProgress(), ...extra })
    expect(() => readProgressFile(bad({ dailyGoal: 'two' }))).toThrow()
    expect(() => readProgressFile(bad({ dailyGoal: 7 }))).toThrow()
    expect(() => readProgressFile(bad({ milestones: { 'first-task': 3 } }))).toThrow()
    expect(() => readProgressFile(bad({ milestones: { 'first-task': 'soon' } }))).toThrow()
    expect(() =>
      readProgressFile(
        bad({ activity: { [ago(0)]: { points: 0, checks: 0, tasksPassed: 0, frozen: 'yes' } } })
      )
    ).toThrow()
  })
})
