import { DEFAULT_SESSION_MINUTES, REMINDER_GRACE_MINUTES, chapterKey, localDate } from './rules'
import type {
  LabSummary,
  PracticeSchedule,
  ProgressState,
  ReminderMethod,
  ReminderSettings,
  Weekday
} from './types'

/** The week as the app shows it, Monday first. */
export const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]
export const WEEKEND: Weekday[] = [6, 0]

const METHODS: ReminderMethod[] = ['app', 'calendar', 'both']
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const MINUTE = 60_000

/** Reads reminders.json, or a patch from the renderer; anything invalid gets its default. */
export function readReminderSettings(saved: unknown): ReminderSettings {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Record<string, unknown>
  const p = (s.schedule && typeof s.schedule === 'object' ? s.schedule : {}) as Record<
    string,
    unknown
  >
  const days = Array.isArray(p.days)
    ? WEEK.filter((day) => (p.days as unknown[]).includes(day)).sort((a, b) => a - b)
    : []
  const minutes =
    Number.isInteger(p.minutes) && (p.minutes as number) > 0 && (p.minutes as number) <= 600
      ? (p.minutes as number)
      : null
  return {
    schedule: {
      days,
      time: typeof p.time === 'string' && TIME.test(p.time) ? p.time : '19:00',
      minutes,
      method: METHODS.includes(p.method as ReminderMethod) ? (p.method as ReminderMethod) : 'app'
    },
    tray: s.tray === true,
    openAtLogin: s.openAtLogin === true
  }
}

export const sendsNotifications = (schedule: PracticeSchedule): boolean =>
  schedule.days.length > 0 && schedule.method !== 'calendar'

export const isPracticeDay = (schedule: PracticeSchedule, date: Date): boolean =>
  schedule.days.includes(date.getDay() as Weekday)

/** The session time on the day of `date`. */
function sessionOn(schedule: PracticeSchedule, date: Date): Date {
  const [hours, minutes] = schedule.time.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
}

/** The first session after `now`, or null without days. */
export function nextSession(schedule: PracticeSchedule, now: Date): Date | null {
  for (let ahead = 0; ahead <= 7; ahead++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead)
    const session = sessionOn(schedule, day)
    if (isPracticeDay(schedule, day) && session > now) return session
  }
  return null
}

export function practicedOn(activity: ProgressState['activity'], date: Date): boolean {
  const day = activity[localDate(date)]
  return !!day && (day.checks > 0 || day.tasksPassed > 0)
}

/**
 * Whether a reminder goes out now. Called every few seconds and on wake, so it decides from the
 * clock alone: a time already past by more than the grace window is skipped, not caught up.
 */
export function shouldRemind({
  schedule,
  now,
  practicedToday,
  lastSent,
  snoozedUntil
}: {
  schedule: PracticeSchedule
  now: Date
  practicedToday: boolean
  /** Local date of the last scheduled reminder. */
  lastSent?: string
  /** ISO time a snoozed reminder is due again. */
  snoozedUntil?: string
}): 'scheduled' | 'snoozed' | null {
  if (!sendsNotifications(schedule) || practicedToday) return null
  const grace = REMINDER_GRACE_MINUTES * MINUTE
  if (snoozedUntil) {
    const late = now.getTime() - new Date(snoozedUntil).getTime()
    if (late >= 0 && late <= grace) return 'snoozed'
  }
  if (!isPracticeDay(schedule, now) || lastSent === localDate(now)) return null
  const late = now.getTime() - sessionOn(schedule, now).getTime()
  return late >= 0 && late <= grace ? 'scheduled' : null
}

export interface ReminderTarget {
  labId: string
  chapterId: string
  labTitle: string
  number: number
  count: number
}

/** The issue a reminder opens: the last one opened, or the next unfinished one after it. */
export function reminderTarget(labs: LabSummary[], progress: ProgressState): ReminderTarget | null {
  const last = progress.lastOpened
  const lab = last && labs.find((candidate) => candidate.id === last.labId)
  if (!lab) return null
  const from = lab.chapters.findIndex((chapter) => chapter.id === last.chapterId)
  const chapter = lab.chapters
    .slice(Math.max(0, from))
    .find((c) => !progress.chapters[chapterKey(lab.id, c.id)]?.completedAt)
  if (!chapter) return null
  return {
    labId: lab.id,
    chapterId: chapter.id,
    labTitle: lab.title,
    number: chapter.number,
    count: lab.chapters.length
  }
}

export function reminderText({
  target,
  minutes,
  streak
}: {
  target: ReminderTarget | null
  minutes: number | null
  streak: number
}): { title: string; body: string } {
  const waiting = target
    ? `Issue ${target.number} of ${target.count} in ${target.labTitle} is waiting.`
    : 'Pick a repo and start its first issue.'
  const title = 'Time to practice'
  if (streak > 0) {
    return { title, body: `${waiting} Pass one task to keep your ${streak} day streak.` }
  }
  return { title, body: minutes ? `${waiting} ${minutes} minutes?` : waiting }
}

const plural = (day: Weekday): string => `${DAY_NAMES[day]}s`

function listWords(words: string[]): string {
  return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

const sameDays = (a: Weekday[], b: Weekday[]): boolean =>
  a.length === b.length && b.every((day) => a.includes(day))

/** "Mondays, Wednesdays and Fridays at 19:00, for 20 minutes"; null without days. */
export function describeSchedule(schedule: PracticeSchedule): string | null {
  const { days, time, minutes } = schedule
  if (days.length === 0) return null
  const which =
    days.length === 7
      ? 'Every day'
      : sameDays(days, WEEKDAYS)
        ? 'Weekdays'
        : sameDays(days, WEEKEND)
          ? 'Weekends'
          : listWords(WEEK.filter((day) => days.includes(day)).map(plural))
  return `${which} at ${time}${minutes ? `, for ${minutes} minutes` : ''}`
}

/** The line on Home: when the next session is and whether today is a practice day. */
export function sessionLine(
  schedule: PracticeSchedule,
  now: Date,
  practicedToday: boolean
): string | null {
  const next = nextSession(schedule, now)
  if (!next) return null
  const days = Math.round(
    (new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (24 * 60 * MINUTE)
  )
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : DAY_NAMES[next.getDay()]
  const line = `Next session: ${when}, ${schedule.time}`
  if (days === 0) return line
  if (!isPracticeDay(schedule, now)) return `No session today. ${line}`
  return `${practicedToday ? 'You practiced today.' : 'Today is a practice day.'} ${line}`
}

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

const icsLocal = (date: Date): string =>
  localDate(date).replaceAll('-', '') +
  'T' +
  `${date.getHours()}`.padStart(2, '0') +
  `${date.getMinutes()}`.padStart(2, '0') +
  '00'

/** The schedule as one repeating calendar event in local time, with an alarm at its start. */
export function calendarEvent(schedule: PracticeSchedule, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const first = nextSession(schedule, today) ?? sessionOn(schedule, today)
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Indent//Practice schedule//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:practice-schedule@indent.app',
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsLocal(first)}`,
    `DURATION:PT${schedule.minutes ?? DEFAULT_SESSION_MINUTES}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${WEEK.filter((d) => schedule.days.includes(d))
      .map((d) => ICS_DAYS[d])
      .join(',')}`,
    'SUMMARY:Practice in Indent',
    'DESCRIPTION:Open Indent and continue where you left off.',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Time to practice in Indent',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n')
}
