import { describe, expect, it } from 'vitest'
import type { ChapterProgress, CheckResult, TaskDef } from '@shared/types'
import { firstLine, focusTasks } from './taskCard'

const task = (id: string, description = `Do ${id}.`): TaskDef => ({
  id,
  title: `Task ${id}`,
  file: 'src/a.js',
  description,
  points: 10,
  nextSteps: [],
  hints: ['', '', '']
})

const result = (passed: boolean, extra: Partial<CheckResult> = {}): CheckResult => ({
  taskId: 'x',
  passed,
  details: [],
  durationMs: 1,
  at: '2026-11-23T00:00:00Z',
  ...extra
})

const progress = (tasks: ChapterProgress['tasks']): ChapterProgress =>
  ({ tasks, nonGreenChecks: 0 }) as unknown as ChapterProgress

describe('firstLine', () => {
  it('keeps the first paragraph as plain words', () => {
    const md =
      'Fill the `<ul id="route-list">` with **one** [item](https://x.test) per route.\n\nMore.'
    expect(firstLine(md)).toBe('Fill the <ul id="route-list"> with one item per route.')
  })

  it('drops list and heading marks and joins lines', () => {
    expect(firstLine('## Goal\n- show the\n  board')).toBe('Goal show the board')
  })
})

describe('focusTasks', () => {
  const tasks = [task('a'), task('b'), task('c')]

  it('describes only the first task not passed yet', () => {
    const shown = focusTasks(tasks, progress({ a: { passed: true, pointsEarned: 10 } }))
    expect(shown.map((t) => [t.status, t.current, t.note])).toEqual([
      ['passed', false, undefined],
      ['open', true, 'Do b.'],
      ['open', false, undefined]
    ])
  })

  it('shows the sentence of the first failed check', () => {
    const lastResult = result(false, {
      details: [
        { name: 'draws rows', passed: true },
        { name: 'adds badges', passed: false, message: 'Each route needs a grade badge.' }
      ]
    })
    const [first] = focusTasks(
      tasks,
      progress({ a: { passed: false, pointsEarned: 0, lastResult } })
    )
    expect(first).toMatchObject({ status: 'failed', note: 'Each route needs a grade badge.' })
  })

  it('falls back to the check name, and prefers an error that stopped the check', () => {
    const named = result(false, { details: [{ name: 'adds badges', passed: false }] })
    expect(
      focusTasks(tasks, progress({ a: { passed: false, pointsEarned: 0, lastResult: named } }))[0]
        .note
    ).toBe('adds badges')
    const broken = result(false, { error: 'The check timed out.' })
    expect(
      focusTasks(tasks, progress({ a: { passed: false, pointsEarned: 0, lastResult: broken } }))[0]
        .note
    ).toBe('The check timed out.')
  })

  it('shows a task that passed once and fails now as failed', () => {
    const lastResult = result(false, { details: [{ name: 'x', passed: false }] })
    expect(
      focusTasks(tasks, progress({ a: { passed: true, pointsEarned: 10, lastResult } }))[0].status
    ).toBe('failed')
  })

  it('works before any progress exists', () => {
    expect(focusTasks(tasks).map((t) => t.status)).toEqual(['open', 'open', 'open'])
  })
})
