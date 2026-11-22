import { CODE_THEMES, DEFAULT_CODE_THEME } from '@indent/design/code-palette'
import { cleanOverrides, keepPickedKeys } from '@/lib/shortcuts'
import type { SettingsState, Theme } from './settings'

/**
 * Saved settings over the defaults. Settings saved before an option existed still get that
 * option's default, a code theme that no longer exists falls back to the default one, and keys
 * saved for a shortcut that no longer exists are dropped. Keys a person picked keep winning over
 * defaults added later.
 */
export function mergeSettings(
  saved: unknown,
  current: SettingsState,
  system: Theme
): SettingsState {
  // `goal` is the one goal that versions before several goals saved.
  const persisted = (saved ?? {}) as Partial<SettingsState> & { goal?: string | null }
  const appearance = persisted.appearance ?? persisted.theme ?? current.appearance
  const known = CODE_THEMES.some((theme) => theme.id === persisted.codeTheme)
  return {
    ...current,
    ...persisted,
    appearance,
    theme: appearance === 'system' ? system : appearance,
    codeTheme: known ? persisted.codeTheme! : DEFAULT_CODE_THEME,
    panels: { ...current.panels, ...persisted.panels },
    editor: { ...current.editor, ...persisted.editor },
    typography: { ...current.typography, ...persisted.typography },
    shortcuts: keepPickedKeys(cleanOverrides(persisted.shortcuts)),
    goals: persisted.goals ?? (persisted.goal ? [persisted.goal] : current.goals)
  }
}
