import { describe, expect, it } from 'vitest'
import type { CheckResult, TaskDef } from '../../shared/types'
import { emptyProgress, readProgressFile, recordCheck, showHint } from './progressLogic'

const now = new Date('2026-11-19T10:00:00')
const task: TaskDef = {
  id: 't1',
  title: 't1',
  file: 'a.ts',
  description: '',
  nextSteps: [],
  hints: ['a', 'b', 'c'],
  points: 10
}
const failed: CheckResult = { taskId: 't1', passed: false, details: [], durationMs: 1, at: '' }

function withFailedChecks(count: number): ReturnType<typeof emptyProgress> {
  const state = emptyProgress()
  for (let i = 0; i < count; i++) recordCheck(state, 'lab', 'ch', [task], [failed], now)
  return state
}

describe('hints in progress', () => {
  it('records the highest hint shown for a task', () => {
    const state = withFailedChecks(5)
    showHint(state, 'lab', 'ch', 't1', 2, now)
    showHint(state, 'lab', 'ch', 't1', 1, now)
    expect(state.chapters['lab/ch'].tasks.t1.hintsShown).toBe(2)
  })

  it('ignores a hint that has not unlocked yet', () => {
    const state = withFailedChecks(3)
    showHint(state, 'lab', 'ch', 't1', 2, now)
    expect(state.chapters['lab/ch'].tasks.t1.hintsShown).toBeUndefined()
    showHint(state, 'lab', 'ch', 't1', 1, now)
    expect(state.chapters['lab/ch'].tasks.t1.hintsShown).toBe(1)
  })

  it('ignores a hint number that is not a whole number from 1', () => {
    const state = withFailedChecks(5)
    showHint(state, 'lab', 'ch', 't1', 0, now)
    showHint(state, 'lab', 'ch', 't1', 1.5, now)
    expect(state.chapters['lab/ch'].tasks.t1.hintsShown).toBeUndefined()
  })

  it('counts every check run on an issue', () => {
    expect(withFailedChecks(4).chapters['lab/ch'].checks).toBe(4)
  })

  it('reads progress files with and without the new fields', () => {
    const state = withFailedChecks(5)
    showHint(state, 'lab', 'ch', 't1', 2, now)
    expect(readProgressFile(JSON.stringify(state)).chapters['lab/ch'].tasks.t1.hintsShown).toBe(2)
    const old = JSON.parse(JSON.stringify(state))
    delete old.chapters['lab/ch'].checks
    delete old.chapters['lab/ch'].tasks.t1.hintsShown
    expect(() => readProgressFile(JSON.stringify(old))).not.toThrow()
    old.chapters['lab/ch'].tasks.t1.hintsShown = 'two'
    expect(() => readProgressFile(JSON.stringify(old))).toThrow()
  })
})
