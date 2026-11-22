import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  onShortcutsChange,
  shortcutLabel,
  shortcutOf,
  SHORTCUTS,
  type ShortcutId
} from '@/lib/shortcuts'
import { HOLD_MS, holdKeyOf, scopeLive } from './hold'

interface Hint {
  id: ShortcutId
  keys: string
  rect: DOMRect
}

const LABEL_HEIGHT = 22

/** The visible, enabled controls marked with `data-shortcut` whose keys work from here. */
function collectHints(): Hint[] {
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"]')
  const top = dialogs[dialogs.length - 1]
  const focus = document.activeElement
  const focusInside = (selector: string): boolean => !!focus?.closest(selector)
  return [...document.querySelectorAll<HTMLElement>('[data-shortcut]')].flatMap((el) => {
    const id = el.dataset.shortcut as ShortcutId
    if (!Object.hasOwn(SHORTCUTS, id) || !shortcutOf(id).keys) return []
    if (el.matches(':disabled, [aria-disabled="true"]')) return []
    if (el.closest('[inert], [aria-hidden="true"]') || (top && !top.contains(el))) return []
    if (!scopeLive(shortcutOf(id).scope, focusInside)) return []
    const rect = el.getBoundingClientRect()
    const onScreen =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    return onScreen ? [{ id, keys: shortcutLabel(id), rect }] : []
  })
}

/**
 * While Shift or Mod is held on its own, marks every control that has a shortcut and shows its
 * keys beside it. Any other key, a click, or leaving the window hides them again.
 */
export function ShortcutHints(): React.JSX.Element | null {
  const [hints, setHints] = useState<Hint[] | null>(null)

  useEffect(() => {
    let timer = 0
    let held: string | null = null
    let shown = false
    const measure = (): void => {
      if (shown) setHints(collectHints())
    }
    const hide = (): void => {
      window.clearTimeout(timer)
      held = null
      if (shown) {
        shown = false
        setHints(null)
      }
    }
    const onDown = (event: KeyboardEvent): void => {
      if (event.repeat && event.key === held) return
      hide()
      const key = event.repeat ? null : holdKeyOf(event, window.platform)
      if (!key) return
      held = key
      timer = window.setTimeout(() => {
        shown = true
        measure()
      }, HOLD_MS)
    }
    const onUp = (event: KeyboardEvent): void => {
      if (event.key === held || shown) hide()
    }
    const onVisibility = (): void => {
      if (document.hidden) hide()
    }
    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    window.addEventListener('pointerdown', hide, true)
    window.addEventListener('blur', hide)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    document.addEventListener('visibilitychange', onVisibility)
    const stop = onShortcutsChange(measure)
    return () => {
      hide()
      stop()
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
      window.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('blur', hide)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (!hints) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {hints.map(({ id, keys, rect }) => {
        // The label sits on the control's bottom edge, so it stays clear of the row below.
        const top = Math.min(rect.bottom - LABEL_HEIGHT / 2, window.innerHeight - LABEL_HEIGHT)
        const left = Math.min(Math.max(rect.left + rect.width / 2, 24), window.innerWidth - 24)
        return (
          <Fragment key={id}>
            <div
              className="absolute rounded-md ring-1 ring-foreground/40"
              style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
            />
            <kbd
              className="absolute -translate-x-1/2 animate-in rounded-sm border border-border bg-popover px-1.5 py-0.5 font-mono text-xs leading-4 text-popover-foreground shadow-md fade-in-0"
              style={{ left, top }}
            >
              {keys}
            </kbd>
          </Fragment>
        )
      })}
    </div>,
    document.body
  )
}
