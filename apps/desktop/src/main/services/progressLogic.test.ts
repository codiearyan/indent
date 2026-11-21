import { describe, expect, it } from 'vitest'
import type { CheckResult, ProgressState, TaskDef } from '../../shared/types'
import { localDate } from '../../shared/rules'
import { emptyProgress, recordCheck, setTip, touch } from './progressLogic'

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
  it('touch creates an entry and updates lastOpened', () => {
    const state = emptyProgress()
    touch(state, 'lab', 'c1', now)
    expect(state.chapters['lab/c1']).toMatchObject({
      nonGreenChecks: 0,
      startedAt: now.toISOString(),
      lastOpenedAt: now.toISOString()
    })
    touch(state, 'lab', 'c1', later)
    expect(state.chapters['lab/c1'].startedAt).toBe(now.toISOString())
    expect(state.chapters['lab/c1'].lastOpenedAt).toBe(later.toISOString())
    expect(state.lastOpened).toEqual({ labId: 'lab', chapterId: 'c1' })
  })

  it('awards full points once, counts non-green runs and completes the chapter', () => {
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
    expect(chapter.tasks.t2).toMatchObject({ passed: true, pointsEarned: 21 })
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

  it('counts failed checks per task and which named checks failed', () => {
    const state = emptyProgress()
    const failing = (names: string[]): CheckResult => ({
      ...result('t1', false),
      details: [
        ...names.map((name) => ({ name, passed: false })),
        { name: 'exports', passed: true }
      ]
    })
    recordCheck(state, 'lab', 'c1', tasks, [failing(['empty list', 'one item'])], now)
    recordCheck(state, 'lab', 'c1', tasks, [failing(['empty list'])], later)
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false, 'timed out')], later)
    const t1 = state.chapters['lab/c1'].tasks.t1
    expect(t1.failedChecks).toBe(2)
    expect(t1.failedNames).toEqual({ 'empty list': 2, 'one item': 1 })
    setTip(state, 'lab', 'c1', 't1', 'Look at the empty list first.', later)
    expect(state.chapters['lab/c1'].tasks.t1.tip).toBe('Look at the empty list first.')
  })

  it('does not count a run that could not execute toward hints', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', false, 'timed out')], now)
    expect(state.chapters['lab/c1'].nonGreenChecks).toBe(0)
    expect(state.activity[today].checks).toBe(1)
  })

  it('keeps working on progress saved with the old mode fields', () => {
    const saved = {
      chapters: {
        'lab/c1': {
          mode: 'easy',
          nonGreenChecks: 2,
          tasks: { t1: { passed: false, pointsEarned: 0, solutionOpened: true } },
          startedAt: now.toISOString(),
          lastOpenedAt: now.toISOString()
        }
      },
      activity: {},
      totalPoints: 4
    }
    const state = JSON.parse(JSON.stringify(saved)) as ProgressState
    touch(state, 'lab', 'c1', later)
    recordCheck(state, 'lab', 'c1', tasks, [result('t1', true), result('t2', true)], later)
    expect(state.chapters['lab/c1'].tasks.t1).toMatchObject({ passed: true, pointsEarned: 10 })
    expect(state.totalPoints).toBe(35)
    expect(state.chapters['lab/c1'].completedAt).toBe(later.toISOString())
  })

  it('ignores results for tasks the chapter does not have', () => {
    const state = emptyProgress()
    recordCheck(state, 'lab', 'c1', tasks, [result('ghost', true)], now)
    expect(state.chapters['lab/c1'].tasks).toEqual({})
    expect(state.totalPoints).toBe(0)
  })
})
