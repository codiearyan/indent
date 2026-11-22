import { useSyncExternalStore } from 'react'
import { onShortcutsChange, shortcutLabel, type ShortcutId } from '@/lib/shortcuts'

function useShortcutLabel(id: ShortcutId): string {
  return useSyncExternalStore(onShortcutsChange, () => shortcutLabel(id))
}

/**
 * A shortcut's keys written the platform way, kept current when they change in Settings. Nothing
 * when the shortcut has no keys.
 */
export function ShortcutKeys({ id }: { id: ShortcutId }): React.JSX.Element {
  return <>{useShortcutLabel(id)}</>
}

/** The keys in brackets after a label, ` (⌘J)`, or nothing when the shortcut has no keys. */
export function ShortcutSuffix({ id }: { id: ShortcutId }): React.JSX.Element | null {
  const keys = useShortcutLabel(id)
  return keys ? <> ({keys})</> : null
}
