import { describe, expect, it } from 'vitest'
import type { CheckResult, TaskDef } from '../../shared/types'
import { localDate } from '../../shared/rules'
import { emptyProgress, openSolution, recordCheck, setMode, touch } from './progressLogic'

const now = new Date('2026-11-19T10:00:00')
const later = new Date('2026-11-19T11:00:00')
const today = localDate(now)

const task = (id: string, points: number): TaskDef => ({
  id,
  title: id,
  file: `src/${id}.ts`,
  description: '',
  nextSteps: [],
  hints: [],
  points
})
const tasks = [task('t1', 10), task('t2', 21)]

const result = (taskId: string, passed: boolean, error?: string): CheckResult => ({
  taskId,
  passed,
  details: [],
  durationMs: 5,
  at: now.toISOString(),
  ...(error ? { error } : {})
})

describe('progress rules', () => {
  it('touch creates a hard-mode entry and updates lastOpened', () => {
    const state = emptyProgress()
    touch(state, 'lab', 'c1', now)
    expect(state.chapters['lab/c1']).toMatchObject({
      mode: 'hard',
      easyLocked: false,
      nonGreenChecks: 0,
      startedAt: now.toISOString(),
      lastOpenedAt: now.toISOString()
    })
    touch(state, 'lab', 'c1', later)
    expect(state.chapters['lab/c1'].startedAt).toBe(now.toISOString())
    expect(state.chapters['lab/c1'].lastOpenedAt).toBe(later.toISOString())
    expect(state.lastOpened).toEqual({ labId: 'lab', chapterId: 'c1' })
  })

  it('awards hard points once, counts non-green runs and completes the chapter', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', true), result('t2', false)], now)
    expect(state.totalPoints).toBe(10)
    expect(state.chapters['lab/c1'].nonGreenChecks).toBe(1)
    expect(state.chapters['lab/c1'].completedAt).toBeUndefined()

    recordCheck(state, 'lab', 'c1', tasks, [result('t1', true), result('t2', true)], later)
    const chapter = state.chapters['lab/c1']
    expect(state.totalPoints).toBe(31)
    expect(chapter.nonGreenChecks).toBe(1)
    expect(chapter.tasks.t1.passedAt).toBe(now.toISOString())
    expect(chapter.tasks.t2).toMatchObject({ passed: true, pointsEarned: 21, passedMode: 'hard' })
    expect(chapter.tasks.t2.lastResult?.passed).toBe(true)
    expect(chapter.completedAt).toBe(later.toISOString())
    expect(state.activity[today]).toEqual({ points: 31, checks: 2, tasksPassed: 2 })
  })

  it('keeps a passed task passed when a later run fails', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', true)], now)
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false)], now)
    expect(state.chapters['lab/c1'].tasks.t1.passed).toBe(true)
    expect(state.chapters['lab/c1'].tasks.t1.lastResult?.passed).toBe(false)
    expect(state.totalPoints).toBe(10)
  })

  it('does not count a run that could not execute toward hints', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false, 'timed out')], now)
    expect(state.chapters['lab/c1'].nonGreenChecks).toBe(0)
    expect(state.activity[today].checks).toBe(1)
  })

  it('pays half in easy mode, and always half after the solution was opened', () => {
    const state = emptyProgress()
    setMode(state, 'lab', 'c1', 'easy', now)
    recordCheck(state, 'lab', 'c1', tasks, [result('t2', true)], now)
    expect(state.chapters['lab/c1'].tasks.t2).toMatchObject({
      pointsEarned: 10,
      passedMode: 'easy'
    })

    expect(() => openSolution(state, 'lab', 'c1', tasks[0], now)).toThrow('Run a check')
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false)], now)
    expect(openSolution(state, 'lab', 'c1', tasks[0], now)).toBe('solution/src/t1.ts')
    expect(state.chapters['lab/c1'].easyLocked).toBe(true)
    expect(state.chapters['lab/c1'].tasks.t1.solutionOpened).toBe(true)
    expect(() => setMode(state, 'lab', 'c1', 'hard', now)).toThrow('stays in easy mode')

    state.chapters['lab/c1'].mode = 'hard'
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', true)], now)
    expect(state.chapters['lab/c1'].tasks.t1).toMatchObject({ pointsEarned: 5, passedMode: 'easy' })
    expect(state.totalPoints).toBe(15)
  })

  it('refuses solutions in hard mode', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false)], now)
    expect(() => openSolution(state, 'lab', 'c1', tasks[0], now)).toThrow('easy mode')
    setMode(state, 'lab', 'c1', 'easy', now)
    setMode(state, 'lab', 'c1', 'hard', now)
    expect(state.chapters['lab/c1'].mode).toBe('hard')
  })

  it('ignores results for tasks the chapter does not have', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('ghost', true)], now)
    expect(state.chapters['lab/c1'].tasks).toEqual({})
    expect(state.totalPoints).toBe(0)
  })
})
