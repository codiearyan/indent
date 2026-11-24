/** Pixel sizes of the workspace panels the learner dragged, kept across launches. */
export interface PanelSizes {
  lesson: number
  /** The lesson's width while the tutor is open too; null until the learner sets one. */
  lessonWithChat: number | null
  chat: number
  /** Null until the learner sets one: the panel opens at its share of the space. */
  browser: number | null
  terminal: number | null
}

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  lesson: 520,
  lessonWithChat: null,
  chat: 360,
  browser: null,
  terminal: null
}

export const LESSON_MIN = 340
export const CHAT_MIN = 260
export const CODE_MIN = 400
export const BROWSER_MIN = 280

export interface SideWidths {
  lesson: number
  chat: number
  work: number
}

/** The width the lesson asks for; opening the tutor takes its room from the lesson first. */
export function lessonWant(sizes: PanelSizes, chat: boolean): number {
  if (!chat) return sizes.lesson
  return sizes.lessonWithChat ?? Math.max(LESSON_MIN, sizes.lesson - sizes.chat)
}

/**
 * Widths of the lesson, the tutor and the work area for a sheet `total` pixels wide. The work area
 * keeps `workMin`: the lesson gives way first, then the tutor, and when that is not enough the
 * lesson steps away (0) until there is room again. A closed panel is 0.
 */
export function planWidths(
  total: number,
  want: { lesson: number | null; chat: number | null },
  workMin: number
): SideWidths {
  let lesson = want.lesson ?? 0
  let chat = want.chat ?? 0
  const lessonFloor = Math.min(lesson, LESSON_MIN)
  const chatFloor = Math.min(chat, CHAT_MIN)
  if (lessonFloor + chatFloor + workMin > total) lesson = 0
  let over = lesson + chat + workMin - total
  if (over > 0) {
    const cut = Math.min(over, lesson - Math.min(lesson, LESSON_MIN))
    lesson -= cut
    over -= cut
  }
  if (over > 0) chat -= Math.min(over, chat - chatFloor)
  return { lesson, chat, work: Math.max(0, total - lesson - chat) }
}
