import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { Chapter } from '@shared/types'
import { useSettings } from '@/stores/settings'

/** Opening an issue with `{ lessonPart }` in its state shows the lesson scrolled to that heading. */
export function useLessonPart(chapter: Chapter | null): void {
  const { state, key } = useLocation()
  const part = (state as { lessonPart?: string | null } | null)?.lessonPart

  useEffect(() => {
    if (part === undefined || !chapter) return
    useSettings.getState().setLeftTab('insights')
    if (!part) return
    const frame = requestAnimationFrame(() => {
      const headings = document.querySelectorAll('#lesson-panel h2')
      Array.from(headings)
        .find((heading) => heading.textContent?.trim() === part)
        ?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [part, chapter, key])
}
