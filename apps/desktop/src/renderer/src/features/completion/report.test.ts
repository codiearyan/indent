import { describe, expect, it } from 'vitest'
import type { ChapterProgress, LabSummary, TaskProgress } from '@shared/types'
import { elapsed, finishedBefore, ideasToImprove, lessonPartFor, repoReport } from './report'

const lab = {
  id: 'shop',
  title: 'Shop',
  chapters: [
    { id: 'one', number: 1, title: 'One', part: 'p', taskCount: 2, points: 20 },
    { id: 'two', number: 2, title: 'Two', part: 'p', taskCount: 2, points: 20 }
  ]
} as LabSummary

const passed = (extra: Partial<TaskProgress> = {}): TaskProgress => ({
  passed: true,
  pointsEarned: 10,
  ...extra
})

function chapter(
  tasks: Record<string, TaskProgress>,
  extra: Partial<ChapterProgress> = {}
): ChapterProgress {
  return {
    nonGreenChecks: 0,
    tasks,
    startedAt: '2026-11-10T09:00:00.000Z',
    lastOpenedAt: '2026-11-10T09:00:00.000Z',
    completedAt: '2026-11-10T10:00:00.000Z',
    ...extra
  }
}

const finished = {
  'shop/one': chapter(
    {
      a: passed({ failedChecks: 4, failedNames: { 'Totals add up': 3, 'It runs': 1 } }),
      b: passed()
    },
    { nonGreenChecks: 4, checks: 6 }
  ),
  'shop/two': chapter(
    { c: passed({ failedChecks: 1, hintsShown: 2 }), d: passed({ failedChecks: 2 }) },
    {
      nonGreenChecks: 3,
      startedAt: '2026-11-12T09:00:00.000Z',
      completedAt: '2026-11-13T15:00:00.000Z'
    }
  )
}

describe('repoReport', () => {
  it('sums the run of a finished repo', () => {
    const report = repoReport(lab, finished)
    expect(report.run).toEqual({ tasks: 4, firstTry: 1, failedChecks: 7, hints: 2 })
    expect(report.points).toBe(40)
    expect(report.tasksPassed).toBe(4)
    expect(report.taskCount).toBe(4)
    expect(report.startedAt).toBe('2026-11-10T09:00:00.000Z')
    expect(report.finishedAt).toBe('2026-11-13T15:00:00.000Z')
  })

  it('counts checks run, or the fewest it could be in older progress', () => {
    // 6 counted on issue one; issue two predates the count: 3 not green plus the green one.
    expect(repoReport(lab, finished).checks).toBe(10)
  })
})

describe('ideasToImprove', () => {
  it('ranks the tasks that took the most tries and hints, with their most failed check', () => {
    const ideas = ideasToImprove(lab, finished)
    expect(ideas.map((idea) => idea.taskId)).toEqual(['a', 'c', 'd'])
    expect(ideas[0]).toMatchObject({
      chapterId: 'one',
      fails: 4,
      hints: 0,
      check: { name: 'Totals add up', fails: 3 }
    })
    expect(ideas[1]).toMatchObject({ chapterId: 'two', fails: 1, hints: 2 })
    expect(ideas[1].check).toBeUndefined()
  })

  it('leaves out tasks that passed after one slip and no hint', () => {
    const smooth = {
      'shop/one': chapter({ a: passed({ failedChecks: 1 }), b: passed() }),
      'shop/two': chapter({ c: passed(), d: passed() })
    }
    expect(ideasToImprove(lab, smooth)).toEqual([])
  })

  it('keeps at most three', () => {
    const rough = {
      'shop/one': chapter({ a: passed({ failedChecks: 5 }), b: passed({ failedChecks: 4 }) }),
      'shop/two': chapter({ c: passed({ failedChecks: 3 }), d: passed({ failedChecks: 2 }) })
    }
    expect(ideasToImprove(lab, rough).map((idea) => idea.taskId)).toEqual(['a', 'b', 'c'])
  })
})

describe('finishedBefore', () => {
  const other = { ...lab, id: 'cafe' } as LabSummary
  const cafeDone = { 'cafe/one': finished['shop/one'], 'cafe/two': finished['shop/two'] }

  it('counts the other repos already finished', () => {
    expect(finishedBefore([lab, other], { ...finished, ...cafeDone }, 'shop')).toBe(1)
  })

  it('is zero for the first repo a learner finishes', () => {
    expect(finishedBefore([lab, other], finished, 'shop')).toBe(0)
  })
})

describe('elapsed', () => {
  it('says minutes, hours or days', () => {
    expect(elapsed('2026-11-10T09:00:00Z', '2026-11-10T09:40:00Z')).toEqual({
      value: 40,
      unit: 'min'
    })
    expect(elapsed('2026-11-10T09:00:00Z', '2026-11-10T14:10:00Z')).toEqual({
      value: 5,
      unit: 'hours'
    })
    expect(elapsed('2026-11-10T09:00:00Z', '2026-11-10T10:00:00Z')).toEqual({
      value: 1,
      unit: 'hour'
    })
    expect(elapsed('2026-11-10T09:00:00Z', '2026-11-13T15:00:00Z')).toEqual({
      value: 3,
      unit: 'days'
    })
  })
})

describe('lessonPartFor', () => {
  const lesson = [
    '# Joins',
    '## What you will be able to do',
    'Join tables and count rows.',
    '## Joining two tables',
    'A join puts each order next to its cafe.',
    '## Counting per group',
    'GROUP BY gives one row per driver, and COUNT counts the orders.',
    '## Try it',
    'Run the checks for every task.'
  ].join('\n')

  it('finds the part of the lesson that talks about the task', () => {
    expect(lessonPartFor(lesson, 'Count orders for every driver')).toBe('Counting per group')
    expect(lessonPartFor(lesson, 'Put each order next to its cafe')).toBe('Joining two tables')
  })

  it('never points at the first or the last part, and gives up without a match', () => {
    expect(lessonPartFor(lesson, 'Run the checks')).toBeNull()
    expect(lessonPartFor('## Only part\nText', 'Only part')).toBeNull()
  })
})
