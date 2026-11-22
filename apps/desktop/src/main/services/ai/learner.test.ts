import { describe, expect, it } from 'vitest'
import type { ChapterDef, LabMeta, ProgressState } from '@shared/types'
import { learnerContext } from './learner'

const task = (id: string): ChapterDef['tasks'][number] => ({
  id,
  title: id,
  file: 'a.js',
  description: '',
  nextSteps: [],
  hints: [],
  points: 10
})

const chapter: ChapterDef = {
  id: 'two',
  title: 'Two',
  files: ['a.js'],
  terminal: { description: '', suggestedCommand: '' },
  tasks: [task('a'), task('b'), task('c')]
} as unknown as ChapterDef

const lab = {
  id: 'shop',
  title: 'The shop',
  parts: [{ title: 'Part', chapters: ['one', 'two', 'three'] }]
} as unknown as LabMeta

const now = new Date(2026, 10, 22, 12)
const day = (offset: number): string => {
  const d = new Date(now)
  d.setDate(d.getDate() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const progress: ProgressState = {
  totalPoints: 220,
  dailyGoal: 2,
  activity: {
    [day(2)]: { points: 20, checks: 3, tasksPassed: 2, goal: 2 },
    [day(1)]: { points: 20, checks: 2, tasksPassed: 2, goal: 2 },
    [day(0)]: { points: 10, checks: 1, tasksPassed: 1, goal: 2 }
  },
  chapters: {
    'shop/one': { nonGreenChecks: 0, tasks: {}, startedAt: '', lastOpenedAt: '', completedAt: 'x' },
    'other/x': { nonGreenChecks: 0, tasks: {}, startedAt: '', lastOpenedAt: '', completedAt: 'y' },
    'shop/two': {
      nonGreenChecks: 2,
      startedAt: '',
      lastOpenedAt: '',
      tasks: {
        a: { passed: true, pointsEarned: 10, hintsShown: 1 },
        b: { passed: false, pointsEarned: 0, hintsShown: 2 }
      }
    }
  }
}

describe('learnerContext', () => {
  it('sums up the learner from the progress file', () => {
    expect(learnerContext(progress, 'shop', lab, chapter, { experience: 'new' }, now)).toEqual({
      level: 2,
      pointsToNextLevel: 80,
      totalPoints: 220,
      streak: 2,
      longestStreak: 2,
      freezes: 0,
      today: { tasksPassed: 1, goal: 2 },
      repo: { title: 'The shop', issueNumber: 2, issueCount: 3, issuesFinished: 1 },
      issue: { tasksPassed: 1, taskCount: 3, hintsOpened: 3 },
      issuesFinished: 2,
      experience: 'new',
      learnFirst: undefined
    })
  })

  it('keeps only known answers from setup', () => {
    const prefs = { experience: 'wizard', learnFirst: 'videos' } as never
    const context = learnerContext(progress, 'shop', lab, chapter, prefs, now)
    expect(context.experience).toBeUndefined()
    expect(context.learnFirst).toBe('videos')
  })

  it('starts from nothing on a first day', () => {
    const empty: ProgressState = { totalPoints: 0, activity: {}, chapters: {} }
    const context = learnerContext(empty, 'shop', lab, chapter, undefined, now)
    expect(context).toMatchObject({ level: 1, streak: 0, today: { tasksPassed: 0, goal: 1 } })
  })
})
