// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { LabSummary, ProgressState } from '../../../../shared/types'
import { chapterKey, levelFor, levelStart, localDate } from '../../../../shared/rules'
import { parseDate, recentWeeks } from '../catalog/activity'

type Activity = ProgressState['activity']

export const WEEKS_SHOWN = 12

export const shortDate = (date: string): string =>
  parseDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export interface WeekTotal {
  /** The Sunday that starts the week. */
  start: string
  points: number
  tasks: number
}

export function weeklySeries(activity: Activity, today = new Date()): WeekTotal[] {
  return recentWeeks(WEEKS_SHOWN, today).map((week) => {
    const total: WeekTotal = { start: week.find(Boolean) ?? '', points: 0, tasks: 0 }
    for (const date of week) {
      if (!date) continue
      total.points += activity[date]?.points ?? 0
      total.tasks += activity[date]?.tasksPassed ?? 0
    }
    return total
  })
}

export interface DayTotal {
  date: string
  total: number
}

/** Points earned so far, day by day, from the first shown week or the first active day. */
export function cumulativeSeries(activity: Activity, today = new Date()): DayTotal[] {
  const firstWeek = recentWeeks(WEEKS_SHOWN, today)[0].find(Boolean)!
  const first = [firstWeek, ...Object.keys(activity)].sort()[0]
  const end = localDate(today)
  const series: DayTotal[] = []
  let total = 0
  for (const day = parseDate(first); localDate(day) <= end; day.setDate(day.getDate() + 1)) {
    const date = localDate(day)
    total += activity[date]?.points ?? 0
    series.push({ date, total })
  }
  return series
}

/** Every level start above 0, up to the first one above `top`. */
export function levelLines(top: number): { level: number; points: number }[] {
  const last = levelFor(top).level + 1
  return Array.from({ length: last - 1 }, (_, i) => ({ level: i + 2, points: levelStart(i + 2) }))
}

export interface RepoDay {
  date: string
  tasks: number
}

/** Tasks passed per local day in one repo, on the days it had any. */
export function repoDays(lab: LabSummary, chapters: ProgressState['chapters']): RepoDay[] {
  const days = new Map<string, number>()
  for (const chapter of lab.chapters) {
    const tasks = Object.values(chapters[chapterKey(lab.id, chapter.id)]?.tasks ?? {})
    for (const task of tasks) {
      if (!task.passed || !task.passedAt) continue
      const date = localDate(new Date(task.passedAt))
      days.set(date, (days.get(date) ?? 0) + 1)
    }
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, tasks]) => ({ date, tasks }))
}

/** Gridlines for a chart: the smallest whole round step (1, 2 or 5 times ten to a power) that
 * reaches `max` in at most 4 steps. */
export function gridSteps(max: number): number[] {
  if (max <= 0) return [0]
  const power = 10 ** (Math.floor(Math.log10(max)) - 1)
  const step = [1, 2, 5, 10, 20, 50]
    .map((m) => m * power)
    .find((s) => s >= 1 && Math.ceil(max / s) <= 4)!
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}
