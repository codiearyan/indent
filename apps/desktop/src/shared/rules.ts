import type { ChapterProgress, ProgressState } from './types'

export const MAX_HINTS = 3
export const CHECKS_BEFORE_FIRST_HINT = 3

export const chapterKey = (labId: string, chapterId: string): string => `${labId}/${chapterId}`

/** The first hint unlocks after 3 checks that are not all green, then one more per check. */
export function hintsUnlocked(nonGreenChecks: number): number {
  return Math.min(MAX_HINTS, Math.max(0, nonGreenChecks - CHECKS_BEFORE_FIRST_HINT + 1))
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
  return taskIds.length > 0 && taskIds.some((id) => progress?.tasks[id]?.passed)
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
