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
  editor: { wordWrap: false, lineNumbers: true, minimap: false, vim: false },
  panels: { files: false, terminal: false, chat: false, zen: false, browser: true },
  typography,
  shortcuts: {},
  guide: null,
  goals: [] as string[]
} as SettingsState

describe('mergeSettings', () => {
  it('leaves Vim mode off for settings saved before it existed', () => {
    const saved = { editor: { wordWrap: true, lineNumbers: true, minimap: false } }
    expect(mergeSettings(saved, defaults, 'dark').editor).toEqual({
      wordWrap: true,
      lineNumbers: true,
      minimap: false,
      vim: false
    })
  })

  it('turns the one goal saved by an older version into the list of goals', () => {
    expect(mergeSettings({ goal: 'backend' }, defaults, 'dark').goals).toEqual(['backend'])
    expect(mergeSettings({ goal: null }, defaults, 'dark').goals).toEqual([])
    expect(mergeSettings({ goals: ['a', 'b'] }, defaults, 'dark').goals).toEqual(['a', 'b'])
  })

  it('does not start the guide for someone whose settings were saved before it existed', () => {
    expect(mergeSettings({ onboarded: true, tourSeen: true }, defaults, 'dark').guide).toBeNull()
  })

  it('loads settings saved before shortcut keys existed with the defaults', () => {
    expect(mergeSettings({ theme: 'light' }, defaults, 'dark').shortcuts).toEqual({})
  })

  it('keeps the shortcut keys that were saved and drops those of gone shortcuts', () => {
    const saved = { shortcuts: { check: 'Mod+K', gone: 'Mod+G', save: 3 } }
    expect(mergeSettings(saved, defaults, 'dark').shortcuts).toEqual({ check: 'Mod+K' })
  })

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
