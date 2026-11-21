import type { ChapterProgress, ProgressState } from './types'

export const MAX_HINTS = 3
export const CHECKS_BEFORE_FIRST_HINT = 3

export const chapterKey = (labId: string, chapterId: string): string => `${labId}/${chapterId}`

/** A task's doc links show after it fails this many checks; the AI tip comes after this many. */
export const FAILS_BEFORE_DOCS = 2
export const FAILS_BEFORE_TIP = 3

/** The first hint unlocks after 3 checks that are not all green, then one more per check. */
export function hintsUnlocked(nonGreenChecks: number): number {
  return Math.min(MAX_HINTS, Math.max(0, nonGreenChecks - CHECKS_BEFORE_FIRST_HINT + 1))
}

export interface LockedHint {
  /** The number of the hint, counted from 1. */
  hint: number
  /** Checks that are not all green still needed to unlock it. */
  checksLeft: number
}

/** Checks that are not all green still needed before hint `hint` (from 1) unlocks; 0 when open. */
export function checksUntilHint(nonGreenChecks: number, hint: number): number {
  return Math.max(0, CHECKS_BEFORE_FIRST_HINT + hint - 1 - Math.max(0, nonGreenChecks))
}

/** The next hint still locked for a task with `hintCount` hints, or null when all are open. */
export function nextLockedHint(nonGreenChecks: number, hintCount = MAX_HINTS): LockedHint | null {
  const unlocked = hintsUnlocked(nonGreenChecks)
  if (unlocked >= Math.min(MAX_HINTS, hintCount)) return null
  return { hint: unlocked + 1, checksLeft: checksUntilHint(nonGreenChecks, unlocked + 1) }
}

/** Failed checks of a task still needed before the AI writes its tip; 0 when it is due. */
export function failsUntilTip(failedChecks: number): number {
  return Math.max(0, FAILS_BEFORE_TIP - failedChecks)
}

export interface LevelInfo {
  level: number
  /** Points earned inside the current level. */
  into: number
  /** Points the current level spans. */
  span: number
}

/** Level n starts at 50 * n * (n - 1) points: 0, 100, 300, 600, 1000... */
export function levelFor(totalPoints: number): LevelInfo {
  let level = 1
  while (50 * (level + 1) * level <= totalPoints) level++
  const start = 50 * level * (level - 1)
  return { level, into: totalPoints - start, span: 100 * level }
}

export function isChapterComplete(
  progress: ChapterProgress | undefined,
  taskIds: string[]
): boolean {
  return taskIds.length > 0 && taskIds.every((id) => progress?.tasks[id]?.passed)
}

export function localDate(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Consecutive days with at least one passed task, ending today or yesterday. */
export function currentStreak(activity: ProgressState['activity'], today = new Date()): number {
  const day = new Date(today)
  if (!activity[localDate(day)]?.tasksPassed) day.setDate(day.getDate() - 1)
  let streak = 0
  while (activity[localDate(day)]?.tasksPassed) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

/** How a finished repo went, summed over its tasks. */
export interface RepoRun {
  tasks: number
  /** Tasks that passed without a failed check. */
  firstTry: number
  failedChecks: number
  /** Hints opened. */
  hints: number
}

export type Stars = 1 | 2 | 3

/**
 * A finished repo earns the first row it meets in full, else one star: a share of tasks passed on
 * the first try, and at most so many failed checks and hints per task. Stars never cost points.
 */
export const STAR_RULES: {
  stars: Stars
  firstTry: number
  failsPerTask: number
  hintsPerTask: number
}[] = [
  { stars: 3, firstTry: 0.6, failsPerTask: 1, hintsPerTask: 0.2 },
  { stars: 2, firstTry: 0.3, failsPerTask: 3, hintsPerTask: 1 }
]

export function repoStars(run: RepoRun): Stars {
  if (run.tasks === 0) return 1
  const row = STAR_RULES.find(
    (rule) =>
      run.firstTry / run.tasks >= rule.firstTry &&
      run.failedChecks / run.tasks <= rule.failsPerTask &&
      run.hints / run.tasks <= rule.hintsPerTask
  )
  return row?.stars ?? 1
}
