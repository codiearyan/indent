import { describe, expect, it } from 'vitest'
import type { AiConfig, ChapterProgress, TaskDef, TaskProgress } from '@shared/types'
import { completionTask, cursorTask, untried, waitsForRequest } from './suggestionTask'

const task = (id: string, file = 'src/reports.js'): TaskDef => ({
  id,
  title: `Title ${id}`,
  file,
  description: `Do ${id}.`,
  nextSteps: ['step'],
  hints: ['SECRET HINT 1', 'SECRET HINT 2', 'SECRET HINT 3'],
  points: 10
})

const tasks = [task('total'), task('top'), task('revenue', 'src/revenue.js')]

const progress = (tasks: Record<string, Partial<TaskProgress>>): ChapterProgress => ({
  nonGreenChecks: 0,
  startedAt: '',
  lastOpenedAt: '',
  tasks: Object.fromEntries(
    Object.entries(tasks).map(([id, p]) => [id, { passed: false, pointsEarned: 0, ...p }])
  )
})

const file = `// Orders. One function per task.
// Task 1: Total one order
export function orderTotal(order) {
  throw new Error('Not implemented')
}

// Task 2: Find the best sellers
// orderTotal from Task 1 helps
export function topCandles(orders, n) {
  `

describe('cursorTask', () => {
  it('picks the task whose marker sits last above the cursor', () => {
    expect(cursorTask(tasks, undefined, 'src/reports.js', file)?.id).toBe('top')
    const insideTask1 = file.slice(0, file.indexOf('throw'))
    expect(cursorTask(tasks, undefined, 'src/reports.js', insideTask1)?.id).toBe('total')
  })

  it('ignores a task named in the middle of a line', () => {
    const text = 'const a = 1 // Task 3 is later\n'
    expect(cursorTask(tasks, undefined, 'src/reports.js', text)?.id).toBe('total')
  })

  it('takes a marked task even when it passed', () => {
    const done = progress({ top: { passed: true } })
    expect(cursorTask(tasks, done, 'src/reports.js', file)?.id).toBe('top')
  })

  it('falls back to the first task not passed, in this file first', () => {
    const done = progress({ total: { passed: true } })
    expect(cursorTask(tasks, done, 'src/reports.js', 'x')?.id).toBe('top')
    expect(cursorTask(tasks, done, 'src/revenue.js', 'x')?.id).toBe('revenue')
    expect(cursorTask(tasks, done, 'src/other.js', 'x')?.id).toBe('top')
  })

  it('has no task when every task passed and no marker is above', () => {
    const done = progress({
      total: { passed: true },
      top: { passed: true },
      revenue: { passed: true }
    })
    expect(cursorTask(tasks, done, 'src/reports.js', 'x')).toBeUndefined()
  })

  it('ignores a marker for a task the issue does not have', () => {
    expect(cursorTask(tasks, undefined, 'src/reports.js', '// Task 9: extra\n')?.id).toBe('total')
  })
})

describe('completionTask', () => {
  const lastResult = {
    taskId: 'top',
    passed: false,
    durationMs: 1,
    at: '',
    details: [
      { name: 'skips cancelled orders', passed: false, message: 'Look at status' },
      { name: 'returns an array', passed: true }
    ]
  }

  it('sends the title, description and failing check names, never hints', () => {
    const sent = completionTask(task('top'), { passed: false, pointsEarned: 0, lastResult })
    expect(sent).toEqual({
      title: 'Title top',
      description: 'Do top.',
      failing: ['skips cancelled orders']
    })
    expect(JSON.stringify(sent)).not.toContain('SECRET')
    expect(JSON.stringify(sent)).not.toContain('Look at status')
  })

  it('sends no failing checks for an untried or passed task', () => {
    expect(completionTask(task('top'), undefined).failing).toEqual([])
    expect(
      completionTask(task('top'), { passed: true, pointsEarned: 10, lastResult }).failing
    ).toEqual([])
  })
})

describe('waitsForRequest', () => {
  const config = (suggestions: AiConfig['suggestions'], enabled = true): AiConfig => ({
    enabled,
    provider: 'anthropic',
    model: null,
    suggestions,
    nudge: true,
    providers: []
  })
  const tried = progress({
    total: { lastResult: { taskId: 'total', passed: false, details: [], durationMs: 1, at: '' } }
  })

  it('always waits when I ask', () => {
    expect(waitsForRequest(config('manual'), tasks[0], tried)).toBe(true)
  })

  it('waits as I type only until the task has had a check', () => {
    expect(untried(undefined)).toBe(true)
    expect(waitsForRequest(config('auto'), tasks[0], undefined)).toBe(true)
    expect(waitsForRequest(config('auto'), tasks[0], tried)).toBe(false)
    expect(waitsForRequest(config('auto'), undefined, undefined)).toBe(false)
  })

  it('never waits when suggestions or AI are off', () => {
    expect(waitsForRequest(config('off'), tasks[0], undefined)).toBe(false)
    expect(waitsForRequest(config('manual', false), tasks[0], undefined)).toBe(false)
    expect(waitsForRequest(null, tasks[0], undefined)).toBe(false)
  })
})
