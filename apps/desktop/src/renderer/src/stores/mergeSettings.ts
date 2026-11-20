import { CODE_THEMES, DEFAULT_CODE_THEME } from '@indent/design/code-palette'
import type { SettingsState, Theme } from './settings'

/**
 * Saved settings over the defaults. Settings saved before an option existed still get that
 * option's default, and a code theme that no longer exists falls back to the default one.
 */
export function mergeSettings(
  saved: unknown,
  current: SettingsState,
  system: Theme
): SettingsState {
  const persisted = (saved ?? {}) as Partial<SettingsState>
  const appearance = persisted.appearance ?? persisted.theme ?? current.appearance
  const known = CODE_THEMES.some((theme) => theme.id === persisted.codeTheme)
  return {
    ...current,
    ...persisted,
    appearance,
    theme: appearance === 'system' ? system : appearance,
    codeTheme: known ? persisted.codeTheme! : DEFAULT_CODE_THEME,
    panels: { ...current.panels, ...persisted.panels },
    editor: { ...current.editor, ...persisted.editor }
  }
}
