import { describe, expect, it } from 'vitest'
import { DEFAULT_PANEL_SIZES, LESSON_MIN, lessonWant, planWidths } from './panelLayout'

const closed = { zen: false, chat: false, browser: false }
const tutor = { zen: false, chat: true, browser: false }

describe('lessonWant', () => {
  it('asks for the saved width without the tutor', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 600 }, closed)).toBe(600)
  })

  it('gives the tutor its room from the lesson, down to the lesson minimum', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 700, chat: 360 }, tutor)).toBe(340)
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 500, chat: 360 }, tutor)).toBe(LESSON_MIN)
  })

  it('uses the width set while the tutor was open', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lessonWithChat: 450 }, tutor)).toBe(450)
  })

  it('steps away in focus mode', () => {
    expect(lessonWant(DEFAULT_PANEL_SIZES, { ...closed, zen: true })).toBeNull()
  })

  it('steps away while the tutor is open beside a page, and comes back without it', () => {
    expect(lessonWant(DEFAULT_PANEL_SIZES, { ...tutor, browser: true })).toBeNull()
    expect(lessonWant(DEFAULT_PANEL_SIZES, { ...closed, browser: true })).toBe(520)
  })
})

describe('planWidths', () => {
  it('keeps every wanted width when they fit', () => {
    expect(planWidths(1400, { lesson: 500, chat: 360 }, 400)).toEqual({
      lesson: 500,
      chat: 360,
      work: 540
    })
  })

  it('shrinks the lesson first, then the tutor', () => {
    expect(planWidths(1100, { lesson: 500, chat: 360 }, 400).lesson).toBe(340)
    const tight = planWidths(1040, { lesson: 500, chat: 360 }, 400)
    expect(tight).toEqual({ lesson: LESSON_MIN, chat: 300, work: 400 })
  })

  it('hides the lesson when even the minimums do not fit', () => {
    expect(planWidths(900, { lesson: 500, chat: 360 }, 400)).toEqual({
      lesson: 0,
      chat: 360,
      work: 540
    })
  })

  it('leaves closed panels closed', () => {
    expect(planWidths(1200, { lesson: null, chat: null }, 400)).toEqual({
      lesson: 0,
      chat: 0,
      work: 1200
    })
  })
})
