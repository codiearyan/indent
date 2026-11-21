import { describe, expect, it } from 'vitest'
import type { DayActivity, LabSummary, ProgressState } from '../../../../shared/types'
import { cumulativeSeries, gridSteps, levelLines, repoDays, weeklySeries } from './series'

const today = new Date(2026, 10, 22)
const day = (tasksPassed: number, points = tasksPassed * 10): DayActivity => ({
  points,
  checks: tasksPassed,
  tasksPassed
})

describe('weeklySeries', () => {
  it('sums points and tasks for each of the last 12 weeks, oldest first', () => {
    const weeks = weeklySeries(
      { '2026-11-22': day(2), '2026-11-21': day(1), '2026-11-15': day(3), '2026-08-01': day(9) },
      today
    )
    expect(weeks).toHaveLength(12)
    expect(weeks.at(-1)).toEqual({ start: '2026-11-22', points: 20, tasks: 2 })
    expect(weeks.at(-2)).toEqual({ start: '2026-11-15', points: 40, tasks: 4 })
    expect(weeks[0].start).toBe('2026-09-06')
    expect(weeks.reduce((sum, w) => sum + w.tasks, 0)).toBe(6)
  })
})

describe('cumulativeSeries', () => {
  it('runs the total day by day from the first of the 12 weeks or the first day, whichever is earlier', () => {
    const series = cumulativeSeries({ '2026-11-20': day(1, 10), '2026-11-22': day(2, 30) }, today)
    expect(series[0]).toEqual({ date: '2026-09-06', total: 0 })
    expect(series.at(-3)).toEqual({ date: '2026-11-20', total: 10 })
    expect(series.at(-1)).toEqual({ date: '2026-11-22', total: 40 })
    const long = cumulativeSeries({ '2025-01-01': day(1, 10) }, today)
    expect(long[0]).toEqual({ date: '2025-01-01', total: 10 })
    expect(long.at(-1)?.total).toBe(10)
  })
})

describe('levelLines', () => {
  it('marks every level start up to the next one above the top', () => {
    expect(levelLines(250)).toEqual([
      { level: 2, points: 100 },
      { level: 3, points: 300 }
    ])
    expect(levelLines(0)).toEqual([{ level: 2, points: 100 }])
  })
})

describe('repoDays', () => {
  it('counts tasks passed per day for the chapters of one repo', () => {
    const lab = { id: 'lab', chapters: [{ id: 'a' }, { id: 'b' }] } as unknown as LabSummary
    const at = (d: number): string => new Date(2026, 10, d, 15).toISOString()
    const chapters: ProgressState['chapters'] = {
      'lab/a': {
        nonGreenChecks: 0,
        startedAt: at(1),
        lastOpenedAt: at(5),
        tasks: {
          t1: { passed: true, pointsEarned: 10, passedAt: at(3) },
          t2: { passed: true, pointsEarned: 10, passedAt: at(3) },
          t3: { passed: false, pointsEarned: 0 }
        }
      },
      'lab/b': {
        nonGreenChecks: 0,
        startedAt: at(1),
        lastOpenedAt: at(5),
        tasks: { t1: { passed: true, pointsEarned: 10, passedAt: at(1) } }
      },
      'other/a': {
        nonGreenChecks: 0,
        startedAt: at(1),
        lastOpenedAt: at(5),
        tasks: { t1: { passed: true, pointsEarned: 10, passedAt: at(2) } }
      }
    }
    expect(repoDays(lab, chapters)).toEqual([
      { date: '2026-11-01', tasks: 1 },
      { date: '2026-11-03', tasks: 2 }
    ])
  })
})

describe('gridSteps', () => {
  it('picks round steps that reach the top value', () => {
    expect(gridSteps(0)).toEqual([0])
    expect(gridSteps(3)).toEqual([0, 1, 2, 3])
    expect(gridSteps(7)).toEqual([0, 2, 4, 6, 8])
    expect(gridSteps(140)).toEqual([0, 50, 100, 150])
  })
})
