import { describe, expect, it } from 'vitest'
import { CHECKS_BEFORE_FIRST_HINT } from '@shared/rules'
import type { ChapterProgress, Kind, LabSummary, PathDef } from '@shared/types'
import {
  HOME_STEPS,
  REPO_STEPS,
  homeSteps,
  nextStage,
  prevStage,
  repoSteps,
  routeOf,
  shownStage,
  stageOn,
  stepOffset,
  suggestedRepo
} from './guide'

function lab(id: string, kind: Kind = 'foundations', extra: Partial<LabSummary> = {}): LabSummary {
  return {
    id,
    title: id,
    description: '',
    category: '',
    language: 'javascript',
    tags: [],
    kind,
    parts: [{ title: 'One', chapters: ['a', 'b'] }],
    chapters: [
      { id: 'a', number: 1, title: 'A', part: 'One', taskCount: 2, points: 20 },
      { id: 'b', number: 2, title: 'B', part: 'One', taskCount: 1, points: 10 }
    ],
    ...extra
  }
}

const opened = (at: string): ChapterProgress => ({
  nonGreenChecks: 0,
  tasks: {},
  startedAt: at,
  lastOpenedAt: at
})

const paths: PathDef[] = [
  {
    id: 'backend',
    title: 'Backend',
    tagline: '',
    description: '',
    stages: [{ title: 'One', labs: ['node', 'sql'] }]
  }
]
const labs = [lab('react', 'project'), lab('node', 'project'), lab('basics'), lab('sql')]
const fresh = { chapters: {}, lastOpened: undefined }

describe('routeOf', () => {
  it('names the routes the guide cares about', () => {
    expect(routeOf('/')).toBe('home')
    expect(routeOf('/labs/js-foundations')).toBe('repo')
    expect(routeOf('/labs')).toBe('other')
    expect(routeOf('/learn/js-foundations/order-reports')).toBe('issue')
    expect(routeOf('/dsa')).toBe('other')
  })
})

describe('stages', () => {
  it('runs home, repo, then the workspace tour, and ends', () => {
    expect(nextStage('home')).toBe('repo')
    expect(nextStage('repo')).toBe('workspace')
    expect(nextStage('workspace')).toBeNull()
  })

  it('goes back from the repo page to Home only', () => {
    expect(prevStage('repo')).toBe('home')
    expect(prevStage('home')).toBeNull()
    expect(prevStage('workspace')).toBeNull()
  })

  it('shows a stage only on its own page', () => {
    expect(shownStage('home', 'home')).toBe('home')
    expect(shownStage('repo', 'repo')).toBe('repo')
    expect(shownStage('home', 'repo')).toBeNull()
    expect(shownStage('repo', 'home')).toBeNull()
    expect(shownStage('home', 'other')).toBeNull()
    expect(shownStage('workspace', 'issue')).toBeNull()
    expect(shownStage(null, 'home')).toBeNull()
  })

  it('hands over to the workspace tour when an issue opens from any stage', () => {
    expect(stageOn('home', 'issue')).toBe('workspace')
    expect(stageOn('repo', 'issue')).toBe('workspace')
    expect(stageOn('home', 'other')).toBe('home')
    expect(stageOn(null, 'issue')).toBeNull()
  })

  it('counts steps across pages', () => {
    expect(stepOffset('home')).toBe(0)
    expect(stepOffset('repo')).toBe(homeSteps({ goal: true, started: false }).length)
    expect(stepOffset('workspace')).toBe(HOME_STEPS + repoSteps(lab('x'), {}).length)
    expect(repoSteps(lab('x'), {})).toHaveLength(REPO_STEPS)
  })
})

describe('suggestedRepo', () => {
  it('suggests the first repo of the goal', () => {
    expect(suggestedRepo(labs, paths, ['backend'], 'new', fresh)?.id).toBe('node')
  })

  it('suggests the first foundations repo when no goal was picked', () => {
    expect(suggestedRepo(labs, paths, [], null, fresh)?.id).toBe('sql')
    expect(suggestedRepo(labs, paths, [], 'some', fresh)?.id).toBe('sql')
  })

  it('suggests the repo opened last for someone who has started', () => {
    const progress = {
      chapters: { 'react/a': opened('2026-01-02T00:00:00Z') },
      lastOpened: { labId: 'react', chapterId: 'a' }
    }
    expect(suggestedRepo(labs, paths, ['backend'], 'new', progress)?.id).toBe('react')
  })

  it('suggests nothing when every repo is finished', () => {
    const done = { passed: true, pointsEarned: 10 }
    const chapter = { ...opened('2026-01-02T00:00:00Z'), completedAt: '2026-01-02T00:00:00Z' }
    const chapters = Object.fromEntries(
      labs.flatMap((l) => [
        [`${l.id}/a`, { ...chapter, tasks: { t1: done, t2: done } }],
        [`${l.id}/b`, { ...chapter, tasks: { t1: done } }]
      ])
    )
    expect(
      suggestedRepo(labs, paths, [], null, { chapters, lastOpened: undefined })
    ).toBeUndefined()
  })
})

describe('copy', () => {
  it('says why this repo is suggested and that any repo is fine', () => {
    expect(homeSteps({ goal: true, started: false })[0].text).toMatch(/goal you picked/)
    expect(homeSteps({ goal: false, started: false })[0].text).toMatch(/any repo is fine/)
    expect(homeSteps({ goal: true, started: true })[0].title).toBe('Up next')
  })

  it('counts the issues and takes the hint rule from the rules', () => {
    const [issues, points] = repoSteps(lab('x'), {})
    expect(issues.title).toBe('Issue 1 of 2')
    expect(points.text).toContain(`after ${CHECKS_BEFORE_FIRST_HINT} checks`)
  })

  it('says a repo that is not here yet downloads when it starts', () => {
    const [, , start] = repoSteps(lab('x', 'foundations', { availability: 'download' }), {})
    expect(start.title).toBe('Start repo')
    expect(start.next).toBe('Start repo')
    expect(start.text).toMatch(/^Downloads the repo/)
  })

  it('offers to continue a started repo', () => {
    const [, , start] = repoSteps(lab('x'), { 'x/a': opened('2026-01-02T00:00:00Z') })
    expect(start.title).toBe('Continue')
    expect(start.text).toMatch(/issue 1, where you left off/)
  })

  it('uses the app words, never the code words', () => {
    const all = [
      ...homeSteps({ goal: true, started: false }),
      ...homeSteps({ goal: false, started: true }),
      ...repoSteps(lab('x', 'foundations', { availability: 'download' }), {})
    ]
    for (const step of all) {
      expect(`${step.title} ${step.text}`).not.toMatch(/\b(lab|chapter|path)s?\b|—/i)
    }
  })
})
