import type {
  ChapterProgress,
  CheckResult,
  Mode,
  ProgressState,
  TaskDef,
  TaskProgress
} from '../../shared/types'
import { chapterKey, isChapterComplete, localDate, pointsFor } from '../../shared/rules'

// Every rule mutates the given state in place; the service saves and returns it.

export const emptyProgress = (): ProgressState => ({ chapters: {}, activity: {}, totalPoints: 0 })

function chapterEntry(
  state: ProgressState,
  labId: string,
  chapterId: string,
  now: Date
): ChapterProgress {
  const at = now.toISOString()
  return (state.chapters[chapterKey(labId, chapterId)] ??= {
    mode: 'hard',
    easyLocked: false,
    nonGreenChecks: 0,
    tasks: {},
    startedAt: at,
    lastOpenedAt: at
  })
}

function taskEntry(chapter: ChapterProgress, taskId: string): TaskProgress {
  return (chapter.tasks[taskId] ??= { passed: false, pointsEarned: 0, solutionOpened: false })
}

export function touch(state: ProgressState, labId: string, chapterId: string, now: Date): void {
  chapterEntry(state, labId, chapterId, now).lastOpenedAt = now.toISOString()
  state.lastOpened = { labId, chapterId }
}

export function setMode(
  state: ProgressState,
  labId: string,
  chapterId: string,
  mode: Mode,
  now: Date
): void {
  const chapter = chapterEntry(state, labId, chapterId, now)
  if (mode === 'hard' && chapter.easyLocked) {
    throw new Error('A solution was opened in this chapter, so it stays in easy mode.')
  }
  chapter.mode = mode
}

/** Returns the solution path relative to the chapter folder. */
export function openSolution(
  state: ProgressState,
  labId: string,
  chapterId: string,
  task: TaskDef,
  now: Date
): string {
  const chapter = chapterEntry(state, labId, chapterId, now)
  if (chapter.mode !== 'easy') throw new Error('Solutions are only available in easy mode.')
  const progress = taskEntry(chapter, task.id)
  if (!progress.lastResult) throw new Error('Run a check on this task before opening its solution.')
  progress.solutionOpened = true
  chapter.easyLocked = true
  return `solution/${task.file}`
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
    if (!result.passed || progress.passed) continue
    const mode = progress.solutionOpened ? 'easy' : chapter.mode
    const points = pointsFor(task.points, mode)
    Object.assign(progress, {
      passed: true,
      pointsEarned: points,
      passedAt: now.toISOString(),
      passedMode: mode
    })
    state.totalPoints += points
    day.points += points
    day.tasksPassed++
  }

  const allTaskIds = tasks.map((t) => t.id)
  if (!chapter.completedAt && isChapterComplete(chapter, allTaskIds)) {
    chapter.completedAt = now.toISOString()
  }
}
