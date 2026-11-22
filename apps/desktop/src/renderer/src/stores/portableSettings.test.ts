import { describe, expect, it } from 'vitest'
import { portableSettings, withBackupSettings } from './portableSettings'
import type { SettingsState } from './settings'

const current = {
  appearance: 'dark',
  theme: 'dark',
  codeTheme: 'ember',
  editor: { wordWrap: false, lineNumbers: true, minimap: false, vim: false },
  panels: { files: false, terminal: false, chat: false, zen: false, browser: true },
  typography: {
    uiFont: null,
    uiSize: 15,
    monoFont: null,
    monoSize: 13,
    lineHeight: 1.6,
    ligatures: false,
    cursor: 'block'
  },
  shortcuts: {},
  goals: [] as string[],
  experience: null,
  telemetry: true,
  onboarded: true,
  ide: 'code',
  launches: 40,
  guide: null
} as SettingsState

describe('portableSettings', () => {
  it('leaves out what belongs to one computer', () => {
    const portable = portableSettings(current)
    expect(portable).toHaveProperty('appearance', 'dark')
    expect(portable).not.toHaveProperty('ide')
    expect(portable).not.toHaveProperty('launches')
    expect(portable).not.toHaveProperty('onboarded')
  })
})

describe('withBackupSettings', () => {
  it('takes the settings of a backup', () => {
    const next = withBackupSettings(
      current,
      { appearance: 'light', goals: ['frontend'], experience: 'some', telemetry: false },
      'dark'
    )
    expect(next).toMatchObject({
      appearance: 'light',
      theme: 'light',
      goals: ['frontend'],
      experience: 'some',
      telemetry: false
    })
  })

  it('keeps what belongs to this computer', () => {
    const next = withBackupSettings(
      current,
      { ide: 'other', launches: 1, onboarded: false },
      'dark'
    )
    expect(next).toMatchObject({ ide: 'code', launches: 40, onboarded: true })
  })

  it('keeps the current value when the backup has the wrong kind', () => {
    const next = withBackupSettings(
      current,
      { appearance: 'blue', goals: 'frontend', telemetry: 'no', editor: null },
      'dark'
    )
    expect(next).toMatchObject({
      appearance: 'dark',
      goals: [],
      telemetry: true,
      editor: current.editor
    })
  })
})
