import { describe, expect, it } from 'vitest'
import {
  calendarEvent,
  describeSchedule,
  isPracticeDay,
  nextSession,
  readReminderSettings,
  reminderTarget,
  reminderText,
  sessionLine,
  shouldRemind
} from './reminders'
import type { LabSummary, PracticeSchedule, ProgressState } from './types'

// November 2026: the 23rd is a Monday.
const at = (day: number, hour = 12, minute = 0): Date => new Date(2026, 10, day, hour, minute)

const MWF: PracticeSchedule = { days: [1, 3, 5], time: '19:00', minutes: 20, notify: true }

describe('readReminderSettings', () => {
  it('is all off when nothing is saved', () => {
    expect(readReminderSettings(undefined)).toEqual({
      schedule: { days: [], time: '19:00', minutes: null, notify: true },
      tray: false,
      openAtLogin: false
    })
  })

  it('keeps a valid schedule and sorts its days', () => {
    const saved = { schedule: { ...MWF, days: [5, 1, 3, 1] }, tray: true, openAtLogin: true }
    expect(readReminderSettings(saved)).toEqual({ schedule: MWF, tray: true, openAtLogin: true })
  })

  it('drops what is not a day, a time or a length, and only false turns notifications off', () => {
    const saved = {
      schedule: { days: [1, 9, -1, 'x', 2.5], time: '25:00', minutes: -5, notify: 'no' }
    }
    expect(readReminderSettings(saved).schedule).toEqual({
      days: [1],
      time: '19:00',
      minutes: null,
      notify: true
    })
    expect(readReminderSettings({ schedule: { notify: false } }).schedule.notify).toBe(false)
  })

  it('only takes true for the switches', () => {
    expect(readReminderSettings({ tray: 'yes', openAtLogin: 1 })).toMatchObject({
      tray: false,
      openAtLogin: false
    })
  })
})

describe('isPracticeDay and nextSession', () => {
  it('knows the practice days', () => {
    expect(isPracticeDay(MWF, at(23))).toBe(true)
    expect(isPracticeDay(MWF, at(24))).toBe(false)
  })

  it('is today when today is a practice day and the time is still ahead', () => {
    expect(nextSession(MWF, at(23, 18, 59))).toEqual(at(23, 19))
  })

  it('moves to the next practice day once the time has passed', () => {
    expect(nextSession(MWF, at(23, 19))).toEqual(at(25, 19))
    expect(nextSession(MWF, at(27, 20))).toEqual(at(30, 19))
  })

  it('comes round a whole week for a single day', () => {
    expect(nextSession({ ...MWF, days: [1] }, at(23, 20))).toEqual(at(30, 19))
  })

  it('has none without days', () => {
    expect(nextSession({ ...MWF, days: [] }, at(23))).toBeNull()
  })
})

describe('shouldRemind', () => {
  const base = { schedule: MWF, practicedToday: false }

  it('reminds at the time on a practice day', () => {
    expect(shouldRemind({ ...base, now: at(23, 19) })).toBe('scheduled')
    expect(shouldRemind({ ...base, now: at(23, 19, 20) })).toBe('scheduled')
  })

  it('waits until the time', () => {
    expect(shouldRemind({ ...base, now: at(23, 18, 59) })).toBeNull()
  })

  it('does not remind of a time long past, as when the app opens late', () => {
    expect(shouldRemind({ ...base, now: at(23, 19, 31) })).toBeNull()
    expect(shouldRemind({ ...base, now: at(23, 23) })).toBeNull()
  })

  it('stays quiet on other days', () => {
    expect(shouldRemind({ ...base, now: at(24, 19) })).toBeNull()
  })

  it('sends at most one a day', () => {
    expect(shouldRemind({ ...base, now: at(23, 19, 5), lastSent: '2026-11-23' })).toBeNull()
    expect(shouldRemind({ ...base, now: at(25, 19, 5), lastSent: '2026-11-23' })).toBe('scheduled')
  })

  it('skips the day once the learner practiced', () => {
    expect(shouldRemind({ ...base, now: at(23, 19), practicedToday: true })).toBeNull()
  })

  it('stays quiet when notifications are turned off', () => {
    const schedule = { ...MWF, notify: false }
    expect(shouldRemind({ ...base, schedule, now: at(23, 19) })).toBeNull()
  })

  it('reminds again when a snooze ends, even after one was sent', () => {
    const snooze = { lastSent: '2026-11-23', snoozedUntil: at(23, 20).toISOString() }
    expect(shouldRemind({ ...base, ...snooze, now: at(23, 19, 59) })).toBeNull()
    expect(shouldRemind({ ...base, ...snooze, now: at(23, 20) })).toBe('snoozed')
  })

  it('forgets a snooze that ended long ago or after practice', () => {
    const snooze = { lastSent: '2026-11-23', snoozedUntil: at(23, 20).toISOString() }
    expect(shouldRemind({ ...base, ...snooze, now: at(23, 21) })).toBeNull()
    expect(shouldRemind({ ...base, ...snooze, now: at(23, 20), practicedToday: true })).toBeNull()
  })
})

describe('reminderText', () => {
  const target = { labId: 'a', chapterId: 'b', labTitle: 'Tidy ledgers', number: 3, count: 5 }

  it('says what is waiting and how long it takes', () => {
    expect(reminderText({ target, minutes: 20, streak: 0 })).toEqual({
      title: 'Time to practice',
      body: 'Issue 3 of 5 in Tidy ledgers is waiting. 20 minutes?'
    })
  })

  it('leaves the length out when there is none', () => {
    expect(reminderText({ target, minutes: null, streak: 0 }).body).toBe(
      'Issue 3 of 5 in Tidy ledgers is waiting.'
    )
  })

  it('names a streak at risk', () => {
    expect(reminderText({ target, minutes: 20, streak: 6 })).toEqual({
      title: 'Time to practice',
      body: 'Issue 3 of 5 in Tidy ledgers is waiting. Pass one task to keep your 6 day streak.'
    })
  })

  it('points at the repos when nothing was started', () => {
    expect(reminderText({ target: null, minutes: 20, streak: 0 }).body).toBe(
      'Pick a repo and start its first issue. 20 minutes?'
    )
  })
})

describe('reminderTarget', () => {
  const lab = {
    id: 'ledger',
    title: 'Tidy ledgers',
    chapters: [{ id: 'one' }, { id: 'two' }, { id: 'three' }].map((c, i) => ({
      ...c,
      number: i + 1
    }))
  } as LabSummary
  const progress = (lastOpened: string, done: string[]): ProgressState => ({
    chapters: Object.fromEntries(
      done.map((id) => [`ledger/${id}`, { completedAt: 'x' }])
    ) as ProgressState['chapters'],
    activity: {},
    totalPoints: 0,
    lastOpened: { labId: 'ledger', chapterId: lastOpened }
  })

  it('is the last opened issue', () => {
    expect(reminderTarget([lab], progress('two', ['one']))).toEqual({
      labId: 'ledger',
      chapterId: 'two',
      labTitle: 'Tidy ledgers',
      number: 2,
      count: 3
    })
  })

  it('moves on to the next unfinished issue when the last one is done', () => {
    expect(reminderTarget([lab], progress('one', ['one', 'two']))?.chapterId).toBe('three')
  })

  it('is nothing when the repo is finished, gone, or nothing was opened', () => {
    expect(reminderTarget([lab], progress('three', ['one', 'two', 'three']))).toBeNull()
    expect(reminderTarget([], progress('one', []))).toBeNull()
    expect(reminderTarget([lab], { ...progress('one', []), lastOpened: undefined })).toBeNull()
  })
})

describe('describeSchedule', () => {
  it('lists the days and the time', () => {
    expect(describeSchedule({ ...MWF, minutes: null })).toBe(
      'Mondays, Wednesdays and Fridays at 19:00'
    )
    expect(describeSchedule({ ...MWF, days: [2], minutes: null })).toBe('Tuesdays at 19:00')
  })

  it('names the common sets', () => {
    const at730 = { ...MWF, time: '07:30', minutes: null }
    expect(describeSchedule({ ...at730, days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day at 07:30')
    expect(describeSchedule({ ...at730, days: [1, 2, 3, 4, 5] })).toBe('Weekdays at 07:30')
    expect(describeSchedule({ ...at730, days: [0, 6] })).toBe('Weekends at 07:30')
  })

  it('adds the length, and starts the week on Monday', () => {
    expect(describeSchedule({ ...MWF, days: [0, 1] })).toBe(
      'Mondays and Sundays at 19:00, for 20 minutes'
    )
  })

  it('is nothing without days', () => {
    expect(describeSchedule({ ...MWF, days: [] })).toBeNull()
  })
})

describe('sessionLine', () => {
  it('says when the next session is today or tomorrow', () => {
    expect(sessionLine(MWF, at(23, 9), false)).toBe('Next session: today, 19:00')
    expect(sessionLine(MWF, at(24, 9), false)).toBe(
      'No session today. Next session: tomorrow, 19:00'
    )
  })

  it('names the weekday further out', () => {
    expect(sessionLine(MWF, at(28, 9), false)).toBe('No session today. Next session: Monday, 19:00')
  })

  it('says whether today was a practice day once its time has passed', () => {
    expect(sessionLine(MWF, at(23, 20), false)).toBe(
      'Today is a practice day. Next session: Wednesday, 19:00'
    )
    expect(sessionLine(MWF, at(23, 20), true)).toBe(
      'You practiced today. Next session: Wednesday, 19:00'
    )
  })

  it('is nothing without a schedule', () => {
    expect(sessionLine({ ...MWF, days: [] }, at(23), false)).toBeNull()
  })
})

describe('calendarEvent', () => {
  const lines = (text: string): string[] => text.split('\r\n')

  it('is a repeating weekly event on the practice days, in local time', () => {
    const ics = lines(calendarEvent(MWF, at(24, 9)))
    expect(ics[0]).toBe('BEGIN:VCALENDAR')
    expect(ics.at(-2)).toBe('END:VCALENDAR')
    expect(ics.at(-1)).toBe('')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(ics).toContain('DTSTART:20261125T190000')
    expect(ics).toContain('DURATION:PT20M')
  })

  it('starts today when today is a practice day', () => {
    expect(lines(calendarEvent(MWF, at(23, 20)))).toContain('DTSTART:20261123T190000')
  })

  it('rings at the start and tells the person to open the app', () => {
    const ics = lines(calendarEvent(MWF, at(24, 9)))
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:PT0M')
    expect(ics).toContain('ACTION:DISPLAY')
    expect(ics.some((line) => line.startsWith('DESCRIPTION:') && line.includes('Indent'))).toBe(
      true
    )
  })

  it('has the fields every event needs', () => {
    const ics = lines(calendarEvent(MWF, at(24, 9)))
    expect(ics).toContain('VERSION:2.0')
    expect(ics.some((line) => line.startsWith('PRODID:'))).toBe(true)
    expect(ics.some((line) => line.startsWith('UID:'))).toBe(true)
    expect(ics.some((line) => /^DTSTAMP:\d{8}T\d{6}Z$/.test(line))).toBe(true)
    expect(ics.every((line) => line.length <= 75)).toBe(true)
  })

  it('gives a session without a length a default one', () => {
    expect(lines(calendarEvent({ ...MWF, minutes: null }, at(24)))).toContain('DURATION:PT30M')
  })
})
