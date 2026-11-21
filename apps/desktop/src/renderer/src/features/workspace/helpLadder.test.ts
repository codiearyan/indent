import { describe, expect, it } from 'vitest'
import { CHECKS_BEFORE_FIRST_HINT, FAILS_BEFORE_TIP } from '@shared/rules'
import { type HelpInput, helpLadder } from './helpLadder'

const fresh: HelpInput = {
  stepCount: 3,
  hintCount: 3,
  shown: 0,
  nonGreenChecks: 0,
  failedChecks: 0,
  hasTip: false,
  passed: false,
  lastFailed: false,
  aiOn: false
}

describe('helpLadder', () => {
  it('starts a fresh task with the steps open and every hint locked', () => {
    const ladder = helpLadder(fresh)
    expect(ladder.rows).toEqual([
      { kind: 'steps' },
      { kind: 'hint', hint: 1, state: 'locked', checksLeft: CHECKS_BEFORE_FIRST_HINT },
      { kind: 'hint', hint: 2, state: 'locked', checksLeft: CHECKS_BEFORE_FIRST_HINT + 1 },
      { kind: 'hint', hint: 3, state: 'locked', checksLeft: CHECKS_BEFORE_FIRST_HINT + 2 }
    ])
    expect(ladder.summary).toBe('Hint 1 unlocks after 3 more checks that do not pass')
  })

  it('adds the tip and the tutor only while AI is on', () => {
    const rows = helpLadder({ ...fresh, aiOn: true }).rows
    expect(rows.slice(-2)).toEqual([
      { kind: 'tip', state: 'locked', failsLeft: FAILS_BEFORE_TIP },
      { kind: 'tutor', withCheck: false }
    ])
    expect(helpLadder(fresh).rows.some((r) => r.kind === 'tip' || r.kind === 'tutor')).toBe(false)
  })

  it('walks the hints from locked to ready to open as checks fail', () => {
    const failed = { ...fresh, nonGreenChecks: 3, failedChecks: 3, lastFailed: true }
    const ladder = helpLadder(failed)
    expect(ladder.rows.filter((r) => r.kind === 'hint').map((r) => r.state)).toEqual([
      'ready',
      'locked',
      'locked'
    ])
    expect(ladder.summary).toBe(
      'Hint 1 is ready. Hint 2 unlocks after your next check that does not pass'
    )
    const opened = helpLadder({ ...failed, shown: 1 })
    expect(opened.rows[1]).toEqual({ kind: 'hint', hint: 1, state: 'open' })
    expect(opened.summary).toBe('Hint 2 unlocks after your next check that does not pass')
  })

  it('never shows more hints opened than are unlocked', () => {
    const rows = helpLadder({ ...fresh, shown: 3, nonGreenChecks: 3 }).rows
    expect(rows.filter((r) => r.kind === 'hint' && r.state === 'open')).toHaveLength(1)
  })

  it('says when every hint is open', () => {
    expect(helpLadder({ ...fresh, nonGreenChecks: 9, shown: 3 }).summary).toBe('Every hint is open')
  })

  it('stops at the hints a task has', () => {
    const rows = helpLadder({ ...fresh, hintCount: 1 }).rows
    expect(rows.filter((r) => r.kind === 'hint')).toHaveLength(1)
    expect(helpLadder({ ...fresh, hintCount: 0, stepCount: 0 }).rows).toEqual([])
  })

  it('makes the tip due after enough failed checks of this task, then ready once written', () => {
    const due = { ...fresh, aiOn: true, failedChecks: FAILS_BEFORE_TIP }
    expect(helpLadder(due).rows).toContainEqual({ kind: 'tip', state: 'coming' })
    expect(helpLadder({ ...due, hasTip: true }).rows).toContainEqual({
      kind: 'tip',
      state: 'ready'
    })
    expect(helpLadder({ ...due, failedChecks: FAILS_BEFORE_TIP - 1 }).rows).toContainEqual({
      kind: 'tip',
      state: 'locked',
      failsLeft: 1
    })
  })

  it('sends the failed check to the tutor when the last check failed', () => {
    const rows = helpLadder({ ...fresh, aiOn: true, lastFailed: true }).rows
    expect(rows.at(-1)).toEqual({ kind: 'tutor', withCheck: true })
  })

  it('keeps only the opened hints on a passed task', () => {
    const passed = { ...fresh, passed: true, aiOn: true, nonGreenChecks: 9, hasTip: true }
    expect(helpLadder({ ...passed, shown: 2 })).toEqual({
      rows: [
        { kind: 'hint', hint: 1, state: 'open' },
        { kind: 'hint', hint: 2, state: 'open' }
      ],
      summary: '2 hints opened'
    })
    expect(helpLadder({ ...passed, shown: 1 }).summary).toBe('1 hint opened')
    expect(helpLadder(passed)).toEqual({ rows: [], summary: null })
  })
})
