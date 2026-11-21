import type { ChapterProgress, DayActivity, MilestoneId, ProgressState } from './types'

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

/** Consecutive days that met their goal, ending today or yesterday; a frozen day bridges a gap. */
export function currentStreak(activity: ProgressState['activity'], today = new Date()): number {
  const day = new Date(today)
  if (!goalMet(activity[localDate(day)])) day.setDate(day.getDate() - 1)
  let streak = 0
  for (let entry = activity[localDate(day)]; covered(entry); entry = activity[localDate(day)]) {
    if (goalMet(entry)) streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export const DAILY_GOALS = [1, 2, 3]
export const DEFAULT_DAILY_GOAL = 1
/** A streak freeze is earned every 7 days of a streak, holding at most 2. */
export const DAYS_PER_FREEZE = 7
export const MAX_FREEZES = 2
export const STREAK_MILESTONES = [7, 30, 100]
/** In the order they are listed. */
export const MILESTONE_IDS: MilestoneId[] = [
  'first-task',
  'first-issue',
  'first-repo',
  'streak-7',
  'streak-30',
  'streak-100',
  'roadmap'
]

export function goalMet(day: DayActivity | undefined): boolean {
  return !!day && day.tasksPassed >= Math.max(1, day.goal ?? DEFAULT_DAILY_GOAL)
}

const covered = (day: DayActivity | undefined): boolean => goalMet(day) || !!day?.frozen

/** The goal of a day: the one it was played with, else the current setting. */
export function goalFor(
  state: Pick<ProgressState, 'activity' | 'dailyGoal'>,
  date = new Date()
): number {
  return state.activity[localDate(date)]?.goal ?? state.dailyGoal ?? DEFAULT_DAILY_GOAL
}

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface StreakWalk {
  /** Freezes held at the end of `through`. */
  freezes: number
  longest: number
  /** The local date each streak milestone was first reached, by its length in days. */
  reachedOn: Partial<Record<number, string>>
}

/** Walks every day from the first active one through `through`, which counts as not over yet. */
export function walkStreak(activity: ProgressState['activity'], through = new Date()): StreakWalk {
  const walk: StreakWalk = { freezes: 0, longest: 0, reachedOn: {} }
  const first = Object.keys(activity).sort()[0]
  if (!first) return walk
  const last = localDate(through)
  let run = 0
  for (const day = parseLocalDate(first); localDate(day) <= last; day.setDate(day.getDate() + 1)) {
    const date = localDate(day)
    const entry = activity[date]
    if (goalMet(entry)) {
      run++
      walk.longest = Math.max(walk.longest, run)
      if (run % DAYS_PER_FREEZE === 0) walk.freezes = Math.min(MAX_FREEZES, walk.freezes + 1)
      if (STREAK_MILESTONES.includes(run)) walk.reachedOn[run] ??= date
    } else if (entry?.frozen) {
      walk.freezes = Math.max(0, walk.freezes - 1)
    } else if (date !== last) {
      run = 0
      walk.freezes = 0
    }
  }
  return walk
}

/**
 * The days before today a freeze should cover now: the missed days since the streak's last day,
 * only when the freezes held cover all of them, so a streak already lost keeps no freezes busy.
 */
export function daysToFreeze(activity: ProgressState['activity'], today = new Date()): string[] {
  const day = new Date(today)
  day.setDate(day.getDate() - 1)
  const missed: string[] = []
  while (missed.length <= MAX_FREEZES && !covered(activity[localDate(day)])) {
    missed.unshift(localDate(day))
    day.setDate(day.getDate() - 1)
  }
  if (missed.length === 0 || missed.length > MAX_FREEZES) return []
  return walkStreak(activity, day).freezes >= missed.length ? missed : []
}

/** What milestones need to know about the repos and roadmaps. */
export interface MilestoneCatalog {
  labs: { id: string; chapters: string[] }[]
  paths: { labs: string[] }[]
}

/**
 * The local date each milestone was reached, read from the progress. The repo milestones need the
 * catalog and are left out without it.
 */
export function milestoneDates(
  state: ProgressState,
  catalog?: MilestoneCatalog
): Partial<Record<MilestoneId, string>> {
  const dates: Partial<Record<MilestoneId, string>> = {}
  const toDay = (iso: string | undefined): string | undefined =>
    iso ? localDate(new Date(iso)) : undefined
  const chapters = Object.values(state.chapters)
  const earliest = (values: (string | undefined)[]): string | undefined =>
    values.filter((v): v is string => !!v).sort()[0]
  const latest = (values: (string | undefined)[]): string | undefined =>
    values.some((v) => !v) ? undefined : values.sort().at(-1)

  dates['first-task'] = toDay(
    earliest(
      chapters.flatMap((c) =>
        Object.values(c.tasks).map((t) => (t.passed ? t.passedAt : undefined))
      )
    )
  )
  dates['first-issue'] = toDay(earliest(chapters.map((c) => c.completedAt)))
  const { reachedOn } = walkStreak(state.activity)
  for (const days of STREAK_MILESTONES) dates[`streak-${days}` as MilestoneId] = reachedOn[days]

  if (catalog) {
    const labDone = new Map(
      catalog.labs.map((lab) => [
        lab.id,
        lab.chapters.length
          ? latest(lab.chapters.map((id) => state.chapters[chapterKey(lab.id, id)]?.completedAt))
          : undefined
      ])
    )
    dates['first-repo'] = toDay(earliest([...labDone.values()]))
    dates.roadmap = toDay(
      earliest(
        catalog.paths.map((path) =>
          path.labs.length
            ? latest([...new Set(path.labs)].map((id) => labDone.get(id)))
            : undefined
        )
      )
    )
  }
  for (const id of MILESTONE_IDS) if (!dates[id]) delete dates[id]
  return dates
}

/** The points at which `level` starts, on the curve of levelFor. */
export const levelStart = (level: number): number => 50 * level * (level - 1)
