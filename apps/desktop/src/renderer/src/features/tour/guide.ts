import { CHECKS_BEFORE_FIRST_HINT } from '@shared/rules'
import type { LabSummary, PathDef, ProgressState } from '@shared/types'
import { labProgress } from '@/features/catalog/labStatus'
import { recommendedOrder } from '@/features/catalog/recommend'
import type { Experience } from '@/stores/settings'
import { TOUR } from './anchors'
import type { TourStep } from './steps'

/**
 * The guide that follows the first-run setup: a few steps on Home, a few on the repo page, then
 * the workspace tour on the first issue. The stage is saved, so the guide picks up where it was.
 */
export type GuideStage = 'home' | 'repo' | 'workspace'

export type GuideRoute = 'home' | 'repo' | 'issue' | 'other'

export function routeOf(pathname: string): GuideRoute {
  if (pathname === '/' || pathname === '') return 'home'
  if (/^\/labs\/[^/]+\/?$/.test(pathname)) return 'repo'
  if (pathname.startsWith('/learn/')) return 'issue'
  return 'other'
}

/** Opening an issue by any way hands the guide to the workspace tour. */
export function stageOn(stage: GuideStage | null, route: GuideRoute): GuideStage | null {
  if (stage && route === 'issue') return 'workspace'
  return stage
}

/** The stage whose steps show on this route, or null to stay out of the way. */
export function shownStage(stage: GuideStage | null, route: GuideRoute): 'home' | 'repo' | null {
  if (stage === 'home' && route === 'home') return 'home'
  if (stage === 'repo' && route === 'repo') return 'repo'
  return null
}

export function nextStage(stage: GuideStage): GuideStage | null {
  if (stage === 'home') return 'repo'
  if (stage === 'repo') return 'workspace'
  return null
}

export function prevStage(stage: GuideStage): GuideStage | null {
  return stage === 'repo' ? 'home' : null
}

export const HOME_STEPS = 2
export const REPO_STEPS = 3

/** Steps of the whole guide before this stage, so the counter runs on across pages. */
export function stepOffset(stage: GuideStage): number {
  if (stage === 'home') return 0
  if (stage === 'repo') return HOME_STEPS
  return HOME_STEPS + REPO_STEPS
}

/** The repo Home's first card shows: the last one opened, else one in progress, else the next. */
export function suggestedRepo(
  labs: LabSummary[],
  paths: PathDef[],
  goals: string[],
  experience: Experience | null,
  progress: Pick<ProgressState, 'chapters' | 'lastOpened'>
): LabSummary | undefined {
  const rows = recommendedOrder(labs, paths, goals, experience).map((lab) => ({
    lab,
    progress: labProgress(lab, progress.chapters)
  }))
  const last = rows.find(
    (row) => row.lab.id === progress.lastOpened?.labId && row.progress.status !== 'completed'
  )
  const inProgress = rows
    .filter((row) => row.progress.status === 'in-progress')
    .sort((a, b) => (b.progress.lastOpenedAt ?? '').localeCompare(a.progress.lastOpenedAt ?? ''))
  return (last ?? inProgress[0] ?? rows.find((row) => row.progress.status === 'not-started'))?.lab
}

export function homeSteps({ goal, started }: { goal: boolean; started: boolean }): TourStep[] {
  const pick = started
    ? 'This is the one you worked on last.'
    : goal
      ? 'This one fits a goal you picked, but any repo is fine.'
      : 'This one is a good place to start, but any repo is fine.'
  return [
    {
      anchor: TOUR.upNext,
      title: started ? 'Up next' : 'Start here',
      text: `A repo is a small company with a problem, and you are its developer. ${pick}`
    },
    {
      anchor: TOUR.upNextStrip,
      title: 'Issues and tasks',
      text: 'A repo has issues, and each issue has tasks. Each group here is an issue and each cell a task. A cell fills when its task passes its checks.',
      next: 'Open repo'
    }
  ]
}

export function repoSteps(lab: LabSummary, chapters: ProgressState['chapters']): TourStep[] {
  const { status, nextChapterId } = labProgress(lab, chapters)
  const next = lab.chapters.find((chapter) => chapter.id === nextChapterId)
  const action =
    status === 'not-started' ? 'Start repo' : status === 'completed' ? 'Review' : 'Continue'
  const start =
    status === 'not-started'
      ? `${lab.availability === 'download' ? 'Downloads the repo, copies' : 'Copies'} its files into a folder on this computer and opens issue 1.`
      : `Opens issue ${next?.number ?? 1}, where you left off.`
  return [
    {
      anchor: TOUR.repoIssues,
      title: `Issue 1 of ${lab.chapters.length}`,
      text: 'The issues are the work, one at a time. Each one is a short lesson and a few tasks.'
    },
    {
      anchor: TOUR.repoFigures,
      title: 'Points and hints',
      text: `A task pays its points once, the first time it passes. Stuck? Hints open after ${CHECKS_BEFORE_FIRST_HINT} checks that are not all green.`
    },
    {
      anchor: TOUR.repoStart,
      title: action,
      text: `${start} A short tour of the issue comes next.`,
      next: action
    }
  ]
}
