import { describe, expect, it } from 'vitest'
import { readSettings, withKey } from './settings'

describe('readSettings', () => {
  it('turns AI on for a file saved before it could be turned off', () => {
    expect(readSettings({ provider: 'codex', model: null }).enabled).toBe(true)
    expect(readSettings({}).enabled).toBe(true)
    expect(readSettings(null).enabled).toBe(true)
  })

  it('keeps AI off once it was turned off', () => {
    expect(readSettings({ enabled: false }).enabled).toBe(false)
  })

  it('offers the tutor after a failed check unless that was turned off', () => {
    expect(readSettings({}).nudge).toBe(true)
    expect(readSettings({ nudge: false }).nudge).toBe(false)
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

describe('withKey', () => {
  it('stores a key without the spaces a paste brings along', () => {
    expect(withKey({}, 'openai', '  sk-test\n')).toEqual({ openai: 'sk-test' })
  })

  it('removes a key for null, blank or a value that is not text', () => {
    const stored = { openai: 'sk-a', anthropic: 'sk-b' }
    expect(withKey(stored, 'openai', null)).toEqual({ anthropic: 'sk-b' })
    expect(withKey(stored, 'openai', '   ')).toEqual({ anthropic: 'sk-b' })
    expect(withKey(stored, 'openai', 42)).toEqual({ anthropic: 'sk-b' })
    expect(stored).toEqual({ openai: 'sk-a', anthropic: 'sk-b' })
  })
})
