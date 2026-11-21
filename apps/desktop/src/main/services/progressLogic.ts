import type {
  ChapterProgress,
  CheckResult,
  ProgressState,
  TaskDef,
  TaskProgress
} from '../../shared/types'
import { chapterKey, isChapterComplete, localDate } from '../../shared/rules'

// Every rule mutates the given state in place; the service saves and returns it.

export const emptyProgress = (): ProgressState => ({ chapters: {}, activity: {}, totalPoints: 0 })

// What 0.1.0 saved on every task when Node or the repo tools were missing. Later versions save no
// result then, and without the tool no check runs to replace it.
const OLD_TOOL_ERRORS =
  /^(Node\.js was not found|Repos need Node|Could not prepare the runtime dependencies|Could not install the runtime dependencies)/

export function dropOldToolErrors(state: ProgressState): void {
  for (const chapter of Object.values(state.chapters)) {
    for (const task of Object.values(chapter.tasks)) {
      if (OLD_TOOL_ERRORS.test(task.lastResult?.error ?? '')) delete task.lastResult
    }
  }
}

function chapterEntry(
  state: ProgressState,
  labId: string,
  chapterId: string,
  now: Date
): ChapterProgress {
  const at = now.toISOString()
  return (state.chapters[chapterKey(labId, chapterId)] ??= {
    nonGreenChecks: 0,
    tasks: {},
    startedAt: at,
    lastOpenedAt: at
  })
}

function taskEntry(chapter: ChapterProgress, taskId: string): TaskProgress {
  return (chapter.tasks[taskId] ??= { passed: false, pointsEarned: 0 })
}

function recordFailure(progress: TaskProgress, result: CheckResult): void {
  progress.failedChecks = (progress.failedChecks ?? 0) + 1
  const names = (progress.failedNames ??= {})
  for (const detail of result.details) {
    if (!detail.passed) names[detail.name] = (names[detail.name] ?? 0) + 1
  }
}

export function setTip(
  state: ProgressState,
  labId: string,
  chapterId: string,
  taskId: string,
  tip: string,
  now: Date
): void {
  taskEntry(chapterEntry(state, labId, chapterId, now), taskId).tip = tip
}

export function touch(state: ProgressState, labId: string, chapterId: string, now: Date): void {
  chapterEntry(state, labId, chapterId, now).lastOpenedAt = now.toISOString()
  state.lastOpened = { labId, chapterId }
}

export function recordCheck(
  state: ProgressState,
  labId: string,
  chapterId: string,
  tasks: TaskDef[],
  results: CheckResult[],
  now: Date
): void {
  const chapter = chapterEntry(state, labId, chapterId, now)
  const day = (state.activity[localDate(now)] ??= { points: 0, checks: 0, tasksPassed: 0 })
  day.checks++
  // A run that could not execute (crash, timeout) says nothing about the code, so it unlocks no hint.
  if (!results.every((r) => r.passed) && !results.some((r) => r.error)) chapter.nonGreenChecks++

  for (const result of results) {
    const task = tasks.find((t) => t.id === result.taskId)
    if (!task) continue
    const progress = taskEntry(chapter, task.id)
    progress.lastResult = result
    if (!result.passed && !result.error) recordFailure(progress, result)
    if (!result.passed || progress.passed) continue
    const points = task.points
    Object.assign(progress, { passed: true, pointsEarned: points, passedAt: now.toISOString() })
    state.totalPoints += points
    day.points += points
    day.tasksPassed++
  }

  const allTaskIds = tasks.map((t) => t.id)
  if (!chapter.completedAt && isChapterComplete(chapter, allTaskIds)) {
    chapter.completedAt = now.toISOString()
  }
}
