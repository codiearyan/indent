import { describe, expect, it } from 'vitest'
import { CODE_THEMES, codePalette } from '@indent/design/code-palette'
import { mergeSettings } from './mergeSettings'
import type { SettingsState, Typography } from './settings'

const typography: Typography = {
  uiFont: null,
  uiSize: 15,
  monoFont: null,
  monoSize: 13,
  lineHeight: 1.6,
  ligatures: false,
  cursor: 'block'
}

const defaults = {
  appearance: 'dark',
  theme: 'dark',
  codeTheme: 'ember',
  editor: { wordWrap: false, lineNumbers: true, minimap: false },
  panels: { files: false, terminal: false, chat: false, zen: false, browser: true },
  typography
} as SettingsState

describe('mergeSettings', () => {
  it('keeps the theme of settings saved before appearance existed', () => {
    const merged = mergeSettings({ theme: 'light', panels: { files: true } }, defaults, 'dark')
    expect(merged.appearance).toBe('light')
    expect(merged.theme).toBe('light')
    expect(merged.panels).toEqual({ ...defaults.panels, files: true })
    expect(merged.editor).toEqual(defaults.editor)
    expect(merged.typography).toEqual(typography)
  })

  it('keeps the font options that were saved and defaults the rest', () => {
    const merged = mergeSettings({ typography: { monoFont: 'Menlo' } }, defaults, 'dark')
    expect(merged.typography).toEqual({ ...typography, monoFont: 'Menlo' })
  })

  it('resolves system to the theme of the computer', () => {
    expect(mergeSettings({ appearance: 'system', theme: 'dark' }, defaults, 'light').theme).toBe(
      'light'
    )
  })

  it('falls back to the default code theme when the saved one is gone', () => {
    expect(mergeSettings({ codeTheme: 'retired' }, defaults, 'dark').codeTheme).toBe('ember')
    expect(mergeSettings({ codeTheme: 'dusk' }, defaults, 'dark').codeTheme).toBe('dusk')
    expect(mergeSettings(undefined, defaults, 'dark')).toEqual(defaults)
  })
})

describe('code themes', () => {
  it('give every role a colour in both modes', () => {
    for (const { id } of CODE_THEMES) {
      for (const mode of ['dark', 'light'] as const) {
        const { ansi, ...roles } = codePalette(id, mode)
        for (const color of [...Object.values(roles), ...Object.values(ansi)]) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/)
        }
      }
    }
  })
})
