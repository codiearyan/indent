import { describe, expect, it } from 'vitest'
import { holdKeyOf, scopeLive } from './hold'

const key = (
  name: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>>
): Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> => ({
  key: name,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
})

describe('holdKeyOf', () => {
  it('starts a hold with Shift, or the platform Mod, on its own', () => {
    expect(holdKeyOf(key('Shift', { shiftKey: true }), 'darwin')).toBe('Shift')
    expect(holdKeyOf(key('Meta', { metaKey: true }), 'darwin')).toBe('Meta')
    expect(holdKeyOf(key('Control', { ctrlKey: true }), 'win32')).toBe('Control')
  })

  it('leaves the other modifier of the platform alone', () => {
    expect(holdKeyOf(key('Control', { ctrlKey: true }), 'darwin')).toBeNull()
    expect(holdKeyOf(key('Meta', { metaKey: true }), 'linux')).toBeNull()
    expect(holdKeyOf(key('Alt', { altKey: true }), 'darwin')).toBeNull()
  })

  it('does not start with another modifier down or a key that types', () => {
    expect(holdKeyOf(key('Shift', { shiftKey: true, metaKey: true }), 'darwin')).toBeNull()
    expect(holdKeyOf(key('Meta', { metaKey: true, shiftKey: true }), 'darwin')).toBeNull()
    expect(holdKeyOf(key('A', { shiftKey: true }), 'darwin')).toBeNull()
    expect(holdKeyOf(key('1', { metaKey: true }), 'darwin')).toBeNull()
  })
})

describe('scopeLive', () => {
  const focusIn = (selector: string) => (query: string) => query === selector

  it('shows editor keys only from the editor and tutor keys only from its composer', () => {
    expect(scopeLive('editor', focusIn('.monaco-editor'))).toBe(true)
    expect(scopeLive('editor', focusIn('.xterm'))).toBe(false)
    expect(scopeLive('chat', focusIn('#tutor-input'))).toBe(true)
    expect(scopeLive('chat', focusIn('.monaco-editor'))).toBe(false)
  })

  it('shows keys that work anywhere in the window', () => {
    expect(scopeLive('workspace', focusIn('.xterm'))).toBe(true)
    expect(scopeLive('everywhere', focusIn(''))).toBe(true)
  })
})
