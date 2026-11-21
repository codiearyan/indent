import { describe, expect, it } from 'vitest'
import type * as Monaco from 'monaco-editor'
import {
  formatKeys,
  isAppShortcut,
  isShellKey,
  matchesKeys,
  SHORTCUTS,
  skipsShortcut,
  toMonacoKeys,
  type ShortcutScope
} from './shortcuts'

const KeyMod = { CtrlCmd: 2048, Shift: 1024, Alt: 512, WinCtrl: 256 }
const KeyCode = {
  Enter: 3,
  Escape: 9,
  Space: 10,
  Comma: 87,
  Backslash: 93,
  KeyE: 35,
  KeyS: 49,
  Digit1: 22
}
const monaco = { KeyMod, KeyCode } as unknown as Pick<typeof Monaco, 'KeyMod' | 'KeyCode'>

const press = (
  key: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {},
  code = ''
): Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> => ({
  key,
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
})

describe('formatKeys', () => {
  it('writes symbols on macOS, in the order the system uses', () => {
    expect(formatKeys('Mod+Enter', 'darwin')).toBe('⌘↵')
    expect(formatKeys('Alt+\\', 'darwin')).toBe('⌥\\')
    expect(formatKeys('Mod+,', 'darwin')).toBe('⌘,')
    expect(formatKeys('Mod+Shift+Alt+k', 'darwin')).toBe('⌥⇧⌘K')
    expect(formatKeys('ArrowLeft', 'darwin')).toBe('←')
  })

  it('writes names joined by + elsewhere', () => {
    for (const platform of ['win32', 'linux']) {
      expect(formatKeys('Mod+Enter', platform)).toBe('Ctrl+Enter')
      expect(formatKeys('Alt+\\', platform)).toBe('Alt+\\')
      expect(formatKeys('Mod+Shift+Alt+k', platform)).toBe('Ctrl+Alt+Shift+K')
      expect(formatKeys('Escape', platform)).toBe('Esc')
    }
  })
})

describe('matchesKeys', () => {
  it('takes Cmd or Ctrl for Mod, as the app always has on every platform', () => {
    expect(matchesKeys(press(',', { metaKey: true }), 'Mod+,')).toBe(true)
    expect(matchesKeys(press(',', { ctrlKey: true }), 'Mod+,')).toBe(true)
    expect(matchesKeys(press(','), 'Mod+,')).toBe(false)
    expect(matchesKeys(press('.', { metaKey: true }), 'Mod+,')).toBe(false)
  })

  it('needs exactly the modifiers it names', () => {
    expect(matchesKeys(press('Enter', { altKey: true }), 'Alt+Enter')).toBe(true)
    expect(matchesKeys(press('Enter'), 'Alt+Enter')).toBe(false)
    expect(matchesKeys(press('Enter', { shiftKey: true }), 'Enter')).toBe(false)
    expect(matchesKeys(press('Enter', { metaKey: true }), 'Enter')).toBe(false)
    expect(matchesKeys(press('S', { shiftKey: true, metaKey: true }), 'Mod+Shift+S')).toBe(true)
    expect(matchesKeys(press('Enter', { metaKey: true, shiftKey: true }), 'Mod+Enter')).toBe(false)
    expect(matchesKeys(press('Enter', { metaKey: true, shiftKey: true }), 'Mod+Shift+Enter')).toBe(
      true
    )
  })

  it('reads the physical key when Shift or Alt changes the character', () => {
    expect(
      matchesKeys(press('!', { metaKey: true, shiftKey: true }, 'Digit1'), 'Mod+Shift+1')
    ).toBe(true)
    expect(matchesKeys(press('?', { ctrlKey: true, shiftKey: true }, 'Slash'), 'Mod+Shift+/')).toBe(
      true
    )
    expect(matchesKeys(press('h', { metaKey: true }, 'KeyJ'), 'Mod+J')).toBe(false)
  })

  it('reads the space bar and letters in either case', () => {
    expect(matchesKeys(press(' '), 'Space')).toBe(true)
    expect(matchesKeys(press('s', { ctrlKey: true }), 'Mod+S')).toBe(true)
    expect(matchesKeys(press('ArrowRight'), 'ArrowLeft')).toBe(false)
  })
})

describe('toMonacoKeys', () => {
  it('maps the editor shortcuts', () => {
    expect(toMonacoKeys(SHORTCUTS.save.keys, monaco)).toBe(KeyMod.CtrlCmd | KeyCode.KeyS)
    expect(toMonacoKeys(SHORTCUTS.check.keys, monaco)).toBe(KeyMod.CtrlCmd | KeyCode.Enter)
    expect(toMonacoKeys(SHORTCUTS.runCommand.keys, monaco)).toBe(
      KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter
    )
    expect(toMonacoKeys(SHORTCUTS.suggest.keys, monaco)).toBe(KeyMod.Alt | KeyCode.Backslash)
    expect(toMonacoKeys(SHORTCUTS.explainCode.keys, monaco)).toBe(
      KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyE
    )
  })

  it('maps digits, Shift and named keys', () => {
    expect(toMonacoKeys('Mod+Shift+1', monaco)).toBe(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Digit1)
    expect(toMonacoKeys('Escape', monaco)).toBe(KeyCode.Escape)
  })

  it('refuses a key it has no code for', () => {
    expect(() => toMonacoKeys('Mod+ArrowUp', monaco)).toThrow()
  })
})

/** A stand-in for a focused element: `closest` finds the selectors it is inside. */
const inside = (...selectors: string[]): EventTarget =>
  ({
    closest: (query: string) => (query.split(', ').some((q) => selectors.includes(q)) ? {} : null)
  }) as unknown as EventTarget

const event = (
  key: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {},
  target: EventTarget | null = null,
  extra: { defaultPrevented?: boolean; repeat?: boolean; altGraph?: boolean } = {}
): Parameters<typeof skipsShortcut>[0] => ({
  ...press(key, mods),
  target,
  defaultPrevented: extra.defaultPrevented ?? false,
  repeat: extra.repeat ?? false,
  getModifierState: (k: string) => k === 'AltGraph' && !!extra.altGraph
})

describe('skipsShortcut', () => {
  it('takes Mod shortcuts while typing, but not plain keys', () => {
    expect(skipsShortcut(event('j', { metaKey: true }, inside('textarea')), 'Mod+J')).toBe(false)
    expect(skipsShortcut(event('j', { metaKey: true }, inside('.monaco-editor')), 'Mod+J')).toBe(
      false
    )
    expect(skipsShortcut(event('Enter', {}, inside('textarea')), 'Enter')).toBe(true)
    expect(skipsShortcut(event('ArrowLeft', {}, inside('input')), 'ArrowLeft')).toBe(true)
    expect(skipsShortcut(event('ArrowLeft', {}, inside('.xterm')), 'ArrowLeft')).toBe(true)
    expect(skipsShortcut(event('ArrowLeft', {}, inside('button')), 'ArrowLeft')).toBe(false)
  })

  it('leaves Ctrl and a letter to the shell in the terminal', () => {
    expect(skipsShortcut(event('j', { ctrlKey: true }, inside('.xterm')), 'Mod+J')).toBe(true)
    expect(skipsShortcut(event('j', { metaKey: true }, inside('.xterm')), 'Mod+J')).toBe(false)
    expect(skipsShortcut(event('j', { ctrlKey: true }, inside('button')), 'Mod+J')).toBe(false)
    expect(skipsShortcut(event('1', { ctrlKey: true }, inside('.xterm')), 'Mod+1')).toBe(false)
  })

  it('skips keys something else handled, repeats, AltGr and open dialogs', () => {
    const mod = { metaKey: true }
    expect(skipsShortcut(event('/', mod, null, { defaultPrevented: true }), 'Mod+/')).toBe(true)
    expect(skipsShortcut(event('j', mod, null, { repeat: true }), 'Mod+J')).toBe(true)
    expect(skipsShortcut(event('2', mod, null, { altGraph: true }), 'Mod+Alt+2')).toBe(true)
    expect(skipsShortcut(event('j', mod, inside('[role="dialog"]')), 'Mod+J')).toBe(true)
    expect(skipsShortcut(event('j', mod), 'Mod+J')).toBe(false)
  })
})

describe('isShellKey', () => {
  it('is Ctrl alone with a letter or a symbol', () => {
    expect(isShellKey(press('c', { ctrlKey: true }))).toBe(true)
    expect(isShellKey(press('/', { ctrlKey: true }))).toBe(true)
    expect(isShellKey(press('c', { metaKey: true }))).toBe(false)
    expect(isShellKey(press('1', { ctrlKey: true }))).toBe(false)
    expect(isShellKey(press('Enter', { ctrlKey: true }))).toBe(false)
    expect(isShellKey(press('F', { ctrlKey: true, shiftKey: true }))).toBe(false)
  })
})

describe('isAppShortcut', () => {
  it('takes the app keys from the terminal and leaves the rest', () => {
    expect(isAppShortcut(press('Enter', { metaKey: true }))).toBe(true)
    expect(isAppShortcut(press('j', { metaKey: true }))).toBe(true)
    expect(isAppShortcut(press('j', { ctrlKey: true }))).toBe(false)
    expect(isAppShortcut(press('c', { metaKey: true }))).toBe(false)
    expect(isAppShortcut(press('ArrowLeft'))).toBe(false)
  })
})

// Which scopes can be live at the same moment.
const OVERLAPS: Record<ShortcutScope, ShortcutScope[]> = {
  everywhere: ['everywhere', 'workspace', 'editor', 'chat', 'tour', 'patterns'],
  workspace: ['everywhere', 'workspace', 'editor', 'chat', 'tour'],
  editor: ['everywhere', 'workspace', 'editor'],
  chat: ['everywhere', 'workspace', 'chat'],
  tour: ['everywhere', 'workspace', 'tour'],
  patterns: ['everywhere', 'patterns'],
  onboarding: ['onboarding']
}

const normal = (keys: string): string => {
  const parts = keys.toLowerCase().split('+')
  const key = parts.pop()
  return [...parts.sort(), key].join('+')
}

describe('SHORTCUTS', () => {
  it('never gives the same keys to two shortcuts that can be live together', () => {
    const entries = Object.entries(SHORTCUTS)
    const clashes = entries.flatMap(([a, x], i) =>
      entries
        .slice(i + 1)
        .filter(([, y]) => OVERLAPS[x.scope].includes(y.scope) && normal(x.keys) === normal(y.keys))
        .map(([b]) => `${a} and ${b}`)
    )
    expect(clashes).toEqual([])
  })
})
