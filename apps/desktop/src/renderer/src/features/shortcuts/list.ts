import {
  formatKeys,
  keysOf,
  SHORTCUTS,
  type Shortcut,
  type ShortcutId,
  type ShortcutScope
} from '@/lib/shortcuts'

const GROUPS: { scope: ShortcutScope; title: string }[] = [
  { scope: 'everywhere', title: 'Everywhere' },
  { scope: 'workspace', title: 'Issue' },
  { scope: 'editor', title: 'Editor' },
  { scope: 'chat', title: 'Tutor' },
  { scope: 'patterns', title: 'Patterns' },
  { scope: 'tour', title: 'Guided tour' },
  { scope: 'onboarding', title: 'Setup' }
]

export interface ShortcutRow {
  id: ShortcutId
  label: string
  /** Each key combination, written the platform way. */
  keys: string[]
}

export interface ShortcutGroup {
  title: string
  rows: ShortcutRow[]
}

/** The keys as words, so a search for "cmd+j" or "ctrl+enter" finds them. */
function spoken(keys: string, platform: string): string {
  const names = platform === 'darwin' ? { Mod: 'cmd', Alt: 'option' } : { Mod: 'ctrl', Alt: 'alt' }
  return keys.replace('Mod', names.Mod).replace('Alt', names.Alt)
}

function matches(shortcut: Shortcut, platform: string, query: string): boolean {
  const text = [
    shortcut.label,
    ...keysOf(shortcut).flatMap((keys) => [formatKeys(keys, platform), spoken(keys, platform)])
  ]
  return text.some((t) => t.toLowerCase().includes(query))
}

/** Every shortcut grouped by where it works, keeping those whose label or keys hold `query`. */
export function shortcutGroups(platform: string, query = ''): ShortcutGroup[] {
  const q = query.trim().toLowerCase()
  const entries = Object.entries(SHORTCUTS) as [ShortcutId, Shortcut][]
  return GROUPS.map(({ scope, title }) => ({
    title,
    rows: entries
      .filter(([, s]) => s.scope === scope && matches(s, platform, q))
      .map(([id, s]) => ({
        id,
        label: s.label,
        keys: keysOf(s).map((keys) => formatKeys(keys, platform))
      }))
  })).filter((group) => group.rows.length > 0)
}
