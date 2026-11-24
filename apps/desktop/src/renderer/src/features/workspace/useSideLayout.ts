import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGroupRef, type Layout, type LayoutChangedMeta } from 'react-resizable-panels'
import { useSettings } from '@/stores/settings'
import { BROWSER_MIN, CODE_MIN, lessonWant, planWidths, type SideWidths } from './panelLayout'

/** Matches --motion-state, the length of a panel opening or closing. */
const SLIDE_MS = 220
/** The lesson and tutor separators, one pixel each. */
const SEPARATORS_PX = 2

interface SideLayout {
  groupRef: ReturnType<typeof useGroupRef>
  elementRef: React.RefObject<HTMLDivElement | null>
  plan: SideWidths
  /** A panel is opening or closing; its content stays at its full width while it slides. */
  sliding: boolean
  onLayoutChanged(layout: Layout, meta: LayoutChangedMeta): void
}

/**
 * Sizes the lesson and the tutor beside the work area: from the widths the learner dragged, the
 * room the window has, and which of them are open. A drag is remembered, and dragging one of them
 * shut closes it.
 */
export function useSideLayout(mounted: boolean, browser: boolean): SideLayout {
  const groupRef = useGroupRef()
  const elementRef = useRef<HTMLDivElement>(null)
  const zen = useSettings((s) => s.panels.zen)
  const chat = useSettings((s) => s.panels.chat)
  const sizes = useSettings((s) => s.panelSizes)
  const [width, setWidth] = useState(0)
  const [sliding, setSliding] = useState(false)

  useLayoutEffect(() => {
    const element = elementRef.current
    if (!mounted || !element) return
    const measure = (): void => setWidth(element.offsetWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [mounted])

  const total = Math.max(0, width - SEPARATORS_PX)
  const plan = planWidths(
    total,
    { lesson: lessonWant(sizes, { zen, chat, browser }), chat: chat ? sizes.chat : null },
    CODE_MIN + (browser ? BROWSER_MIN + 1 : 0)
  )
  const planRef = useRef(plan)
  useLayoutEffect(() => {
    planRef.current = plan
  })
  const slideEnd = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(slideEnd.current), [])

  const shown = useRef({ zen, chat })
  useLayoutEffect(() => {
    const element = elementRef.current
    if (!total || !element) return
    // Only opening or closing slides; a window resize or a drag follows the pointer.
    const toggled = shown.current.zen !== zen || shown.current.chat !== chat
    shown.current = { zen, chat }
    if (toggled) {
      element.dataset.sliding = ''
      setSliding(true)
      clearTimeout(slideEnd.current)
      slideEnd.current = setTimeout(() => {
        delete element.dataset.sliding
        setSliding(false)
      }, SLIDE_MS)
    }
    const lesson = (plan.lesson / total) * 100
    const tutor = (plan.chat / total) * 100
    groupRef.current?.setLayout({ lesson, chat: tutor, work: 100 - lesson - tutor })
    // `mounted`: a group that comes back after a notice starts from its default sizes.
  }, [mounted, total, plan.lesson, plan.chat, zen, chat, groupRef])

  const onLayoutChanged = (layout: Layout, meta: LayoutChangedMeta): void => {
    if (!meta.isUserInteraction || !total) return
    const px = (id: string): number => Math.round(((layout[id] ?? 0) / 100) * total)
    const lesson = px('lesson')
    const tutor = px('chat')
    const before = planRef.current
    const settings = useSettings.getState()
    // Set directly: turning focus mode on from its button also closes the tutor, a drag does not.
    if (before.lesson > 0 && lesson === 0) {
      useSettings.setState((s) => ({ panels: { ...s.panels, zen: true } }))
    }
    if (before.lesson === 0 && lesson > 0) settings.setPanel('zen', false)
    if (before.chat > 0 && tutor === 0) settings.setPanel('chat', false)
    if (before.chat === 0 && tutor > 0) settings.setPanel('chat', true)
    const open = useSettings.getState().panels.chat
    settings.setPanelSizes({
      ...(lesson > 0 && (open ? { lessonWithChat: lesson } : { lesson })),
      ...(tutor > 0 && { chat: tutor })
    })
  }

  return { groupRef, elementRef, plan, sliding, onLayoutChanged }
}
