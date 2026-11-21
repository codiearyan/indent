import type { LabSummary, ProgressState } from '@shared/types'
import { FAILS_BEFORE_DOCS, chapterKey, repoStars, type RepoRun, type Stars } from '@shared/rules'
import { labProgress } from '../catalog/labStatus'

type Chapters = ProgressState['chapters']

export interface RepoReport {
  run: RepoRun
  stars: Stars
  points: number
  tasksPassed: number
  taskCount: number
  checks: number
  startedAt?: string
  finishedAt?: string
}

export function repoReport(lab: LabSummary, chapters: Chapters): RepoReport {
  const run: RepoRun = { tasks: 0, firstTry: 0, failedChecks: 0, hints: 0 }
  let points = 0
  let tasksPassed = 0
  let checks = 0
  let startedAt: string | undefined
  let finishedAt: string | undefined
  for (const summary of lab.chapters) {
    run.tasks += summary.taskCount
    const chapter = chapters[chapterKey(lab.id, summary.id)]
    if (!chapter) continue
    // Progress saved before checks were counted: every check that was not green, plus the green one.
    checks += chapter.checks ?? chapter.nonGreenChecks + (chapter.completedAt ? 1 : 0)
    if (!startedAt || chapter.startedAt < startedAt) startedAt = chapter.startedAt
    if (chapter.completedAt && (!finishedAt || chapter.completedAt > finishedAt)) {
      finishedAt = chapter.completedAt
    }
    for (const task of Object.values(chapter.tasks)) {
      points += task.pointsEarned
      run.failedChecks += task.failedChecks ?? 0
      run.hints += task.hintsShown ?? 0
      if (!task.passed) continue
      tasksPassed++
      if (!task.failedChecks) run.firstTry++
    }
  }
  return {
    run,
    stars: repoStars(run),
    points,
    tasksPassed,
    taskCount: run.tasks,
    checks,
    startedAt,
    finishedAt
  }
}

export interface Idea {
  chapterId: string
  taskId: string
  fails: number
  hints: number
  /** The check of the task that failed most often. */
  check?: { name: string; fails: number }
}

/** The tasks a learner struggled with most: failed checks and opened hints, at most three. */
export function ideasToImprove(lab: LabSummary, chapters: Chapters, max = 3): Idea[] {
  const ideas: (Idea & { weight: number; issueChecks: number })[] = []
  for (const summary of lab.chapters) {
    const chapter = chapters[chapterKey(lab.id, summary.id)]
    if (!chapter) continue
    for (const [taskId, task] of Object.entries(chapter.tasks)) {
      const fails = task.failedChecks ?? 0
      const hints = task.hintsShown ?? 0
      if (fails < FAILS_BEFORE_DOCS && hints === 0) continue
      const [name, count] =
        Object.entries(task.failedNames ?? {}).sort((a, b) => b[1] - a[1])[0] ?? []
      ideas.push({
        chapterId: summary.id,
        taskId,
        fails,
        hints,
        check: name && count ? { name, fails: count } : undefined,
        weight: fails + hints,
        issueChecks: chapter.nonGreenChecks
      })
    }
  }
  return ideas
    .sort((a, b) => b.weight - a.weight || b.issueChecks - a.issueChecks)
    .slice(0, max)
    .map(({ chapterId, taskId, fails, hints, check }) => ({
      chapterId,
      taskId,
      fails,
      hints,
      check
    }))
}

/** Repos other than `labId` that are already finished. */
export function finishedBefore(labs: LabSummary[], chapters: Chapters, labId: string): number {
  return labs.filter((lab) => lab.id !== labId && labProgress(lab, chapters).status === 'completed')
    .length
}

export function elapsed(from: string, to: string): { value: number; unit: string } {
  const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000))
  if (minutes < 60) return { value: minutes, unit: 'min' }
  const hours = Math.round(minutes / 60)
  if (hours < 24) return { value: hours, unit: hours === 1 ? 'hour' : 'hours' }
  const days = Math.round(hours / 24)
  return { value: days, unit: days === 1 ? 'day' : 'days' }
}

const COMMON = new Set(['with', 'that', 'this', 'from', 'into', 'your', 'every', 'have', 'what'])

function stems(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]{4,}/g) ?? [])
    .filter((word) => !COMMON.has(word))
    .map((word) => word.slice(0, 5))
}

/**
 * The `##` part of a lesson that shares the most words with `about` (a task's title and its most
 * failed check). The first part sets the scene and the last says how to try it, so neither counts.
 */
export function lessonPartFor(lesson: string, about: string): string | null {
  const wanted = new Set(stems(about))
  const parts = lesson.split(/^(?=##\s)/m).filter((part) => part.startsWith('##'))
  let best: { heading: string; score: number } | null = null
  for (const part of parts.slice(1, -1)) {
    const [first, ...body] = part.split('\n')
    const heading = first.replace(/^##\s+/, '').trim()
    const score =
      2 * stems(heading).filter((stem) => wanted.has(stem)).length +
      stems(body.join(' ')).filter((stem) => wanted.has(stem)).length
    if (score > 0 && (!best || score > best.score)) best = { heading, score }
  }
  return best?.heading ?? null
}
