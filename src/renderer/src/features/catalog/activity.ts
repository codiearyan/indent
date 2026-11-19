// Relative imports keep this file loadable by vitest, which has no path aliases.
import type { DayActivity, ProgressState } from '../../../../shared/types'
import { localDate } from '../../../../shared/rules'

type Activity = ProgressState['activity']

/** Seven local dates, Sunday first; null for days outside the range. */
export type Week = (string | null)[]

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function weeksBetween(start: Date, end: Date): Week[] {
  const weeks: Week[] = []
  const day = new Date(start)
  day.setDate(day.getDate() - day.getDay())
  while (day <= end) {
    const week: Week = []
    for (let i = 0; i < 7; i++) {
      week.push(day < start || day > end ? null : localDate(day))
      day.setDate(day.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function yearWeeks(year: number): Week[] {
  return weeksBetween(new Date(year, 0, 1), new Date(year, 11, 31))
}

/** The last `count` weeks, ending with the week that holds today. */
export function recentWeeks(count: number, today = new Date()): Week[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const start = new Date(end)
  start.setDate(end.getDate() - end.getDay() - (count - 1) * 7)
  return weeksBetween(start, end)
}

/** 0 to 4, by tasks passed that day. */
export function intensity(day: DayActivity | undefined): number {
  const passed = day?.tasksPassed ?? 0
  if (passed === 0) return 0
  if (passed === 1) return 1
  if (passed <= 3) return 2
  if (passed <= 5) return 3
  return 4
}

export function longestStreak(activity: Activity): number {
  const days = Object.keys(activity)
    .filter((d) => activity[d].tasksPassed > 0)
    .sort()
  let best = 0
  let run = 0
  let prev: Date | undefined
  for (const date of days) {
    const day = parseDate(date)
    if (prev) prev.setDate(prev.getDate() + 1)
    run = prev && localDate(prev) === date ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

export interface YearSummary {
  points: number
  tasksPassed: number
  activeDays: number
  monthPoints: number[]
}

export function yearSummary(activity: Activity, year: number): YearSummary {
  const summary: YearSummary = {
    points: 0,
    tasksPassed: 0,
    activeDays: 0,
    monthPoints: Array(12).fill(0)
  }
  for (const [date, day] of Object.entries(activity)) {
    const d = parseDate(date)
    if (d.getFullYear() !== year) continue
    summary.points += day.points
    summary.tasksPassed += day.tasksPassed
    if (day.checks > 0 || day.tasksPassed > 0) summary.activeDays++
    summary.monthPoints[d.getMonth()] += day.points
  }
  return summary
}
