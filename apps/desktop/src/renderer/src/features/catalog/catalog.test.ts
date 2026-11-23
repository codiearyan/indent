import { describe, expect, it } from 'vitest'
import type { ChapterProgress, DayActivity, LabSummary } from '../../../../shared/types'
import { NO_FILTERS, kindOf, matchesFilters } from './labFilters'
import { labProgress, stageFinished } from './labStatus'
import { intensity, longestStreak, recentWeeks, yearSummary, yearWeeks } from './activity'

const lab: LabSummary = {
  id: 'lab',
  title: 'Lab',
  description: '',
  category: 'AI engineering',
  language: 'typescript',
  tags: [],
  kind: 'project',
  parts: [{ title: 'One', chapters: ['a', 'b'] }],
  chapters: [
    { id: 'a', number: 1, title: 'A', part: 'One', taskCount: 2, points: 20 },
    { id: 'b', number: 2, title: 'B', part: 'One', taskCount: 3, points: 30 }
  ]
}

function chapter(completed: boolean, pointsEarned = 0): ChapterProgress {
  return {
    nonGreenChecks: 0,
    tasks: { t1: { passed: completed, pointsEarned } },
    startedAt: '2026-01-01T00:00:00Z',
    lastOpenedAt: '2026-01-02T00:00:00Z',
    completedAt: completed ? '2026-01-02T00:00:00Z' : undefined
  }
}

const day = (tasksPassed: number, points = 0): DayActivity => ({
  points,
  checks: tasksPassed,
  tasksPassed
})

describe('labProgress', () => {
  it('is not started without chapter entries', () => {
    const p = labProgress(lab, {})
    expect(p).toMatchObject({ status: 'not-started', chaptersDone: 0, nextChapterId: 'a' })
    expect(p.taskCount).toBe(5)
    expect(p.points).toBe(50)
  })

  it('is in progress once a chapter is opened, and points at the first open chapter', () => {
    const p = labProgress(lab, { 'lab/a': chapter(true, 10), 'lab/b': chapter(false) })
    expect(p).toMatchObject({ status: 'in-progress', chaptersDone: 1, nextChapterId: 'b' })
    expect(p.pointsEarned).toBe(10)
    expect(p.tasksPassed).toBe(1)
  })

  it('is completed when every chapter is, and goes back to the first chapter', () => {
    const p = labProgress(lab, { 'lab/a': chapter(true), 'lab/b': chapter(true) })
    expect(p).toMatchObject({ status: 'completed', chaptersDone: 2, nextChapterId: 'a' })
  })

  it('fills an unfinished issue by its share of passed tasks', () => {
    const started = { ...chapter(false), tasks: { t1: { passed: true, pointsEarned: 10 } } }
    expect(labProgress(lab, {}).issuesFilled).toBe(0)
    expect(labProgress(lab, { 'lab/a': chapter(true), 'lab/b': started }).issuesFilled).toBeCloseTo(
      1 + 1 / 3
    )
  })
})

describe('heatmap weeks', () => {
  it('lays a year out in Sunday-first columns padded with null', () => {
    const weeks = yearWeeks(2026)
    // 2026-01-01 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, null, '2026-01-01', '2026-01-02', '2026-01-03'])
    expect(weeks).toHaveLength(53)
    expect(weeks.flat().filter(Boolean)).toHaveLength(365)
    expect(weeks.at(-1)?.[4]).toBe('2026-12-31')
  })

  it('ends the recent weeks today', () => {
    const weeks = recentWeeks(12, new Date(2026, 10, 19))
    expect(weeks).toHaveLength(12)
    expect(weeks[0][0]).toBe('2026-08-30')
    expect(weeks[11]).toEqual([
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      null,
      null
    ])
  })

  it('maps tasks passed to five steps', () => {
    expect([0, 1, 2, 3, 4, 6].map((n) => intensity(day(n)))).toEqual([0, 1, 2, 2, 3, 4])
    expect(intensity(undefined)).toBe(0)
  })
})

describe('streaks and year summary', () => {
  it('finds the longest run of days with passed tasks, across month ends', () => {
    const activity = {
      '2026-01-30': day(1),
      '2026-01-31': day(2),
      '2026-02-01': day(1),
      '2026-02-03': day(1),
      '2026-02-04': day(0)
    }
    expect(longestStreak(activity)).toBe(3)
    expect(longestStreak({})).toBe(0)
  })

  it('sums one year only', () => {
    const s = yearSummary(
      { '2025-12-31': day(1, 5), '2026-01-05': day(2, 20), '2026-03-01': day(1, 10) },
      2026
    )
    expect(s).toMatchObject({ points: 30, tasksPassed: 3, activeDays: 2 })
    expect(s.monthPoints.slice(0, 3)).toEqual([20, 0, 10])
  })
})

describe('stageFinished', () => {
  const labs = new Map([[lab.id, lab]])
  const all = { 'lab/a': chapter(true), 'lab/b': chapter(true) }

  it('is finished when every repo of the stage is finished', () => {
    expect(stageFinished({ title: 'S', labs: ['lab'] }, labs, all)).toBe(true)
    expect(stageFinished({ title: 'S', labs: ['lab'] }, labs, { 'lab/a': chapter(true) })).toBe(
      false
    )
  })

  it('is not finished while it is empty, has a repo still to come, or names one that is not here', () => {
    expect(stageFinished({ title: 'S', labs: [] }, labs, all)).toBe(false)
    expect(stageFinished({ title: 'S', labs: ['lab'], soon: ['Next'] }, labs, all)).toBe(false)
    expect(stageFinished({ title: 'S', labs: ['lab', 'gone'] }, labs, all)).toBe(false)
  })
})

describe('kindOf', () => {
  it('counts a repo with no kind, or one this app does not know, as a project', () => {
    expect(kindOf({ ...lab, kind: 'bug-hunt' })).toBe('bug-hunt')
    expect(kindOf({ ...lab, kind: undefined })).toBe('project')
    expect(kindOf({ ...lab, kind: 'workshop' as never })).toBe('project')
  })
})

describe('matchesFilters', () => {
  it('keeps everything when nothing is picked', () => {
    expect(matchesFilters(lab, 'not-started', NO_FILTERS)).toBe(true)
  })

  it('needs every kind of filter to match, and any choice inside one kind', () => {
    const picked = { ...NO_FILTERS, fields: ['Databases', 'AI engineering'] }
    expect(matchesFilters(lab, 'not-started', picked)).toBe(true)
    expect(matchesFilters(lab, 'not-started', { ...picked, languages: ['sql'] })).toBe(false)
    expect(matchesFilters(lab, 'not-started', { ...picked, languages: ['typescript'] })).toBe(true)
    expect(matchesFilters(lab, 'not-started', { ...picked, status: 'completed' })).toBe(false)
  })

  it('searches the title, shelf and tags without minding case', () => {
    expect(matchesFilters(lab, 'not-started', { ...NO_FILTERS, query: ' ENGINEER ' })).toBe(true)
    expect(matchesFilters(lab, 'not-started', { ...NO_FILTERS, query: 'python' })).toBe(false)
  })
})
