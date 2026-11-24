import { describe, expect, it } from 'vitest'
import { DEFAULT_PANEL_SIZES, LESSON_MIN, lessonWant, planWidths } from './panelLayout'

describe('lessonWant', () => {
  it('asks for the saved width without the tutor', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 600 }, false)).toBe(600)
  })

  it('gives the tutor its room from the lesson, down to the lesson minimum', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 700, chat: 360 }, true)).toBe(340)
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lesson: 500, chat: 360 }, true)).toBe(LESSON_MIN)
  })

  it('uses the width set while the tutor was open', () => {
    expect(lessonWant({ ...DEFAULT_PANEL_SIZES, lessonWithChat: 450 }, true)).toBe(450)
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
