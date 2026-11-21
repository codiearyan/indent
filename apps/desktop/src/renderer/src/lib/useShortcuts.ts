import { useEffect, useEffectEvent } from 'react'
import { isShortcut, shortcutOf, skipsShortcut, type ShortcutId } from './shortcuts'

/** Runs a handler when its shortcut is pressed anywhere in the window. A missing handler is off. */
export function useShortcuts(handlers: Partial<Record<ShortcutId, (() => void) | false>>): void {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    for (const [id, handler] of Object.entries(handlers) as [ShortcutId, (() => void) | false][]) {
      if (!handler || !isShortcut(event, id)) continue
      if (skipsShortcut(event, shortcutOf(id).keys, window.platform)) return
      event.preventDefault()
      handler()
      return
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => onKey(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
