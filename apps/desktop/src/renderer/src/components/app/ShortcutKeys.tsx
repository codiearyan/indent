import { useSyncExternalStore } from 'react'
import { onShortcutsChange, shortcutLabel, type ShortcutId } from '@/lib/shortcuts'

/** A shortcut's keys written the platform way, kept current when they change in Settings. */
export function ShortcutKeys({ id }: { id: ShortcutId }): React.JSX.Element {
  return <>{useSyncExternalStore(onShortcutsChange, () => shortcutLabel(id))}</>
}
