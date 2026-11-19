import { describe, expect, it } from 'vitest'
import { readSettings } from './settings'

describe('readSettings', () => {
  it('turns AI on for a file saved before it could be turned off', () => {
    expect(readSettings({ provider: 'codex', model: null }).enabled).toBe(true)
    expect(readSettings({}).enabled).toBe(true)
    expect(readSettings(null).enabled).toBe(true)
  })

  it('keeps AI off once it was turned off', () => {
    expect(readSettings({ enabled: false }).enabled).toBe(false)
  })
})

describe('suggestionMode', () => {
  it('moves a saved boolean to a mode', () => {
    expect(readSettings({ suggestions: true }).suggestions).toBe('auto')
    expect(readSettings({ suggestions: false }).suggestions).toBe('off')
    expect(readSettings({}).suggestions).toBe('off')
  })

  it('keeps a saved mode and drops anything else', () => {
    expect(readSettings({ suggestions: 'manual' }).suggestions).toBe('manual')
    expect(readSettings({ suggestions: 'auto' }).suggestions).toBe('auto')
    expect(readSettings({ suggestions: 'always' }).suggestions).toBe('off')
  })
})
