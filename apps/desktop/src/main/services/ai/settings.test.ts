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
