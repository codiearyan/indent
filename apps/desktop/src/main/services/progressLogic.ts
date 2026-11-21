import type {
  ChapterProgress,
  CheckResult,
  ProgressState,
  ProgressSummary,
  TaskDef,
  TaskProgress
} from '../../shared/types'
import {
  chapterKey,
  checksRun,
  DAILY_GOALS,
  daysToFreeze,
  hintsUnlocked,
  isChapterComplete,
  localDate,
  milestoneDates,
  type MilestoneCatalog
} from '../../shared/rules'

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

/** Remembers the highest hint shown for a task, so a finished repo can count them. */
export function showHint(
  state: ProgressState,
  labId: string,
  chapterId: string,
  taskId: string,
  hint: number,
  now: Date
): void {
  const chapter = chapterEntry(state, labId, chapterId, now)
  if (!Number.isInteger(hint) || hint < 1 || hint > hintsUnlocked(chapter.nonGreenChecks)) return
  const task = taskEntry(chapter, taskId)
  task.hintsShown = Math.max(task.hintsShown ?? 0, hint)
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
  chapter.checks = checksRun(chapter) + 1
  if (state.dailyGoal) day.goal = state.dailyGoal
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

export const NOT_A_PROGRESS_FILE = 'That is not an Indent progress file.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const isCount = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const isText = (value: unknown): boolean => typeof value === 'string'
const optional = (value: unknown, is: (value: unknown) => boolean): boolean =>
  value === undefined || is(value)
const isLocalDate = (value: unknown): boolean =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const everyValue = (value: unknown, is: (value: unknown) => boolean): boolean =>
  isRecord(value) && Object.values(value).every(is)

const isTask = (task: unknown): boolean =>
  isRecord(task) &&
  typeof task.passed === 'boolean' &&
  isCount(task.pointsEarned) &&
  optional(task.passedAt, isText) &&
  optional(task.failedChecks, isCount) &&
  optional(task.failedNames, (names) => everyValue(names, isCount)) &&
  optional(task.tip, isText) &&
  optional(task.hintsShown, isCount)

const isChapter = (chapter: unknown): boolean =>
  isRecord(chapter) &&
  isCount(chapter.nonGreenChecks) &&
  everyValue(chapter.tasks, isTask) &&
  isText(chapter.startedAt) &&
  isText(chapter.lastOpenedAt) &&
  optional(chapter.completedAt, isText) &&
  optional(chapter.checks, isCount)

const isDay = (day: unknown): boolean =>
  isRecord(day) &&
  isCount(day.points) &&
  isCount(day.checks) &&
  isCount(day.tasksPassed) &&
  optional(day.goal, isCount) &&
  optional(day.frozen, (frozen) => typeof frozen === 'boolean')

const isResult = (result: unknown): boolean =>
  isRecord(result) &&
  isText(result.taskId) &&
  typeof result.passed === 'boolean' &&
  Array.isArray(result.details) &&
  result.details.every(
    (detail) =>
      isRecord(detail) &&
      isText(detail.name) &&
      typeof detail.passed === 'boolean' &&
      optional(detail.message, isText) &&
      optional(detail.output, isText)
  ) &&
  optional(result.error, isText)

/**
 * Reads a progress file a person picked. It throws unless every part the app reads has its
 * shape, because what it returns becomes the progress. A last result that is damaged is dropped:
 * the next check writes a new one.
 */
export function readProgressFile(text: string): ProgressState {
  const notAFile = new Error(NOT_A_PROGRESS_FILE)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw notAFile
  }
  const valid =
    isRecord(data) &&
    everyValue(data.chapters, isChapter) &&
    everyValue(data.activity, isDay) &&
    isCount(data.totalPoints) &&
    optional(
      data.lastOpened,
      (opened) => isRecord(opened) && isText(opened.labId) && isText(opened.chapterId)
    ) &&
    optional(data.dailyGoal, (goal) => DAILY_GOALS.includes(goal as number)) &&
    optional(data.milestones, (milestones) => everyValue(milestones, isLocalDate))
  if (!valid) throw notAFile
  const state = data as unknown as ProgressState
  for (const chapter of Object.values(state.chapters)) {
    for (const task of Object.values(chapter.tasks)) {
      if (!isResult(task.lastResult)) delete task.lastResult
    }
  }
  dropOldToolErrors(state)
  return state
}

export function summarize(state: ProgressState): ProgressSummary {
  const tasks = Object.values(state.chapters).flatMap((chapter) => Object.values(chapter.tasks))
  return { totalPoints: state.totalPoints, tasksPassed: tasks.filter((t) => t.passed).length }
}

export function setDailyGoal(state: ProgressState, goal: number, now: Date): void {
  if (!DAILY_GOALS.includes(goal)) throw new Error(`Not a daily goal: ${goal}`)
  state.dailyGoal = goal
  const today = state.activity[localDate(now)]
  if (today) today.goal = goal
}

/** Covers the days a streak missed with the freezes it holds; run before anything else changes. */
export function settleFreezes(state: ProgressState, now: Date): void {
  for (const date of daysToFreeze(state.activity, now)) {
    state.activity[date] = {
      ...(state.activity[date] ?? { points: 0, checks: 0, tasksPassed: 0 }),
      frozen: true
    }
  }
}

/** Keeps the first date of every milestone reached; a recorded one never moves or goes away. */
export function recordMilestones(state: ProgressState, catalog?: MilestoneCatalog): void {
  for (const [id, date] of Object.entries(milestoneDates(state, catalog))) {
    ;(state.milestones ??= {})[id as keyof typeof state.milestones] ??= date
  }
}
