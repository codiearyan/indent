import type { ShortcutScope } from '@/lib/shortcuts'

/** How long a modifier is held on its own before the shortcut hints show. */
export const HOLD_MS = 500

type ModifierEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

/**
 * The modifier this key press holds on its own, if it starts a hold: Shift, or Mod (Cmd on
 * macOS, Ctrl elsewhere), with no other modifier down.
 */
export function holdKeyOf(event: ModifierEvent, platform: string): string | null {
  const mod = platform === 'darwin' ? 'Meta' : 'Control'
  const down = [event.metaKey, event.ctrlKey, event.altKey, event.shiftKey].filter(Boolean).length
  if (down !== 1) return null
  if (event.key === 'Shift' && event.shiftKey) return 'Shift'
  if (event.key === mod && (mod === 'Meta' ? event.metaKey : event.ctrlKey)) return mod
  return null
}

/**
 * Whether a shortcut of this scope answers keys where focus is now, so a hint shows only for
 * keys that would work: editor keys need the editor focused, the tutor's keys its composer.
 */
export function scopeLive(
  scope: ShortcutScope,
  focusInside: (selector: string) => boolean
): boolean {
  if (scope === 'editor') return focusInside('.monaco-editor')
  if (scope === 'chat') return focusInside('#tutor-input')
  return true
}
