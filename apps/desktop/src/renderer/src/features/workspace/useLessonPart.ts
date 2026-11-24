import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { chapterKey } from '@shared/rules'
import type { Chapter } from '@shared/types'
import { useSettings } from '@/stores/settings'
import { useOpenTabs } from '@/stores/tabs'
import { currentPart } from './lessonPart'

const lessonHeadings = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('#lesson-panel .zone-lesson h2'))

/**
 * Opening an issue with `{ lessonPart }` in its state shows the lesson scrolled to that heading;
 * otherwise it resumes at the heading last read. Returns the lesson's scroll handler.
 */
export function useLessonPart(
  chapter: Chapter | null,
  visible: boolean
): (event: React.UIEvent) => void {
  const { state, key } = useLocation()
  const part = (state as { lessonPart?: string | null } | null)?.lessonPart
  const id = chapter && chapterKey(chapter.labId, chapter.id)
  // The heading to scroll to once the lesson is on screen; undefined when done.
  const pending = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    if (part !== undefined) useSettings.getState().setLeftTab('insights')
    pending.current =
      part !== undefined ? part : (useOpenTabs.getState().lessonPartByChapter[id] ?? null)
  }, [part, id, key])

  useEffect(() => {
    if (!visible || pending.current === undefined) return
    const target = pending.current
    pending.current = undefined
    const frame = requestAnimationFrame(() => {
      const heading = target && lessonHeadings().find((h) => h.textContent?.trim() === target)
      if (heading) heading.scrollIntoView({ block: 'start' })
      else lessonHeadings()[0]?.closest('[data-slot=scroll-area-viewport]')?.scrollTo({ top: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, id, key])

  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return useCallback(
    (event: React.UIEvent) => {
      const viewport = event.target as HTMLElement
      // A code block scrolling sideways reaches this handler too.
      if (viewport.dataset.slot !== 'scroll-area-viewport') return
      if (!id || pending.current !== undefined) return
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        const top = viewport.getBoundingClientRect().top
        const headings = lessonHeadings().map((h) => ({
          text: h.textContent?.trim() ?? '',
          top: h.getBoundingClientRect().top - top
        }))
        useOpenTabs.getState().rememberLessonPart(id, currentPart(headings, 0))
      })
    },
    [id]
  )
}
