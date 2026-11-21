import { describe, expect, it } from 'vitest'
import type * as Monaco from 'monaco-editor'
import {
  formatKeys,
  isAppShortcut,
  isShellKey,
  isShortcut,
  keysOf,
  matchesKeys,
  SHORTCUTS,
  skipsShortcut,
  toMonacoKeys,
  applyOverrides,
  conflictOf,
  keysFromEvent,
  refusal,
  setShortcutOverrides,
  swapKeys,
  withKeys,
  type ShortcutId
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
    expect(() => toMonacoKeys('Mod+Pause', monaco)).toThrow()
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

const skips = (e: Parameters<typeof skipsShortcut>[0], keys: string, platform = 'linux'): boolean =>
  skipsShortcut(e, keys, platform)

describe('skipsShortcut', () => {
  it('takes Mod shortcuts while typing, but not plain keys', () => {
    expect(skips(event('j', { metaKey: true }, inside('textarea')), 'Mod+J')).toBe(false)
    expect(skips(event('j', { metaKey: true }, inside('.monaco-editor')), 'Mod+J')).toBe(false)
    expect(skips(event('Enter', {}, inside('textarea')), 'Enter')).toBe(true)
    expect(skips(event('ArrowLeft', {}, inside('input')), 'ArrowLeft')).toBe(true)
    expect(skips(event('ArrowLeft', {}, inside('.xterm')), 'ArrowLeft')).toBe(true)
    expect(skips(event('ArrowLeft', {}, inside('button')), 'ArrowLeft')).toBe(false)
  })

  it('leaves Ctrl and a letter to the shell in the terminal', () => {
    expect(skips(event('j', { ctrlKey: true }, inside('.xterm')), 'Mod+J')).toBe(true)
    expect(skips(event('j', { metaKey: true }, inside('.xterm')), 'Mod+J')).toBe(false)
    expect(skips(event('j', { ctrlKey: true }, inside('button')), 'Mod+J')).toBe(false)
    expect(skips(event('1', { ctrlKey: true }, inside('.xterm')), 'Mod+1')).toBe(false)
  })

  it('leaves Ctrl and a letter to every text field on macOS', () => {
    expect(skips(event('b', { ctrlKey: true }, inside('textarea')), 'Mod+B', 'darwin')).toBe(true)
    expect(skips(event('w', { ctrlKey: true }, inside('.monaco-editor')), 'Mod+W', 'darwin')).toBe(
      true
    )
    expect(skips(event('b', { metaKey: true }, inside('textarea')), 'Mod+B', 'darwin')).toBe(false)
    expect(skips(event('b', { ctrlKey: true }, inside('button')), 'Mod+B', 'darwin')).toBe(false)
    expect(skips(event('b', { ctrlKey: true }, inside('textarea')), 'Mod+B', 'win32')).toBe(false)
  })

  it('skips keys something else handled, repeats, AltGr and open dialogs', () => {
    const mod = { metaKey: true }
    expect(skips(event('/', mod, null, { defaultPrevented: true }), 'Mod+/')).toBe(true)
    expect(skips(event('j', mod, null, { repeat: true }), 'Mod+J')).toBe(true)
    expect(skips(event('2', mod, null, { altGraph: true }), 'Mod+Alt+2')).toBe(true)
    expect(skips(event('j', mod, inside('[role="dialog"]')), 'Mod+J')).toBe(true)
    expect(skips(event('j', mod), 'Mod+J')).toBe(false)
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

describe('SHORTCUTS', () => {
  it('never gives the same keys to two shortcuts that can be live together', () => {
    const shortcuts = applyOverrides({})
    const clashes = (Object.keys(SHORTCUTS) as ShortcutId[]).flatMap((id) =>
      keysOf(SHORTCUTS[id]).flatMap((keys) => {
        const other = conflictOf(shortcuts, id, keys)
        return other ? [`${id} and ${other}`] : []
      })
    )
    expect(clashes).toEqual([])
  })

  it('opens the shortcut list with either of its keys', () => {
    expect(isShortcut(press('/', { metaKey: true }, 'Slash'), 'shortcutList')).toBe(true)
    expect(isShortcut(press('?', { metaKey: true, shiftKey: true }, 'Slash'), 'shortcutList')).toBe(
      true
    )
    expect(isShortcut(press('/', {}, 'Slash'), 'shortcutList')).toBe(false)
  })
})

const keyEvent = (
  key: string,
  code: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}
): Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> =>
  press(key, mods, code)

describe('keysFromEvent', () => {
  it('writes Cmd as Mod on macOS and Ctrl as Mod elsewhere', () => {
    expect(keysFromEvent(keyEvent('k', 'KeyK', { metaKey: true }), 'darwin')).toBe('Mod+K')
    expect(keysFromEvent(keyEvent('k', 'KeyK', { ctrlKey: true }), 'win32')).toBe('Mod+K')
    expect(keysFromEvent(keyEvent('k', 'KeyK', { ctrlKey: true }), 'darwin')).toBe('K')
    expect(keysFromEvent(keyEvent('k', 'KeyK', { metaKey: true }), 'linux')).toBe('K')
  })

  it('puts Mod, Alt and Shift in that order', () => {
    const all = { metaKey: true, ctrlKey: true, altKey: true, shiftKey: true }
    expect(keysFromEvent(keyEvent('K', 'KeyK', all), 'darwin')).toBe('Mod+Alt+Shift+K')
    expect(keysFromEvent(keyEvent('K', 'KeyK', all), 'linux')).toBe('Mod+Alt+Shift+K')
  })

  it('reads the physical key when Shift or Option changes the character', () => {
    expect(keysFromEvent(keyEvent('˚', 'KeyK', { altKey: true }), 'darwin')).toBe('Alt+K')
    expect(keysFromEvent(keyEvent('!', 'Digit1', { shiftKey: true, ctrlKey: true }), 'win32')).toBe(
      'Mod+Shift+1'
    )
    expect(keysFromEvent(keyEvent('?', 'Slash', { shiftKey: true, metaKey: true }), 'darwin')).toBe(
      'Mod+Shift+/'
    )
  })

  it('names Enter, arrows, Space and function keys', () => {
    expect(keysFromEvent(keyEvent('Enter', 'Enter', { metaKey: true }), 'darwin')).toBe('Mod+Enter')
    expect(keysFromEvent(keyEvent('ArrowLeft', 'ArrowLeft'), 'linux')).toBe('ArrowLeft')
    expect(keysFromEvent(keyEvent(' ', 'Space'), 'linux')).toBe('Space')
    expect(keysFromEvent(keyEvent('F5', 'F5'), 'win32')).toBe('F5')
  })

  it('keeps waiting while only modifiers are held', () => {
    expect(keysFromEvent(keyEvent('Meta', 'MetaLeft', { metaKey: true }), 'darwin')).toBeNull()
    expect(keysFromEvent(keyEvent('Shift', 'ShiftLeft', { shiftKey: true }), 'linux')).toBeNull()
    expect(keysFromEvent(keyEvent('Control', 'ControlLeft', { ctrlKey: true }), 'win32')).toBeNull()
  })

  it('records keys the editor can bind', () => {
    for (const keys of ['Mod+Alt+Shift+K', 'Mod+Shift+/', 'Mod+Enter', 'Alt+F5', 'Mod+ArrowUp']) {
      expect(() => toMonacoKeys(keys, monaco)).not.toThrow()
    }
  })
})

describe('refusal', () => {
  it('refuses the keys the system keeps on macOS only', () => {
    expect(refusal('Mod+Q', 'workspace', 'darwin')).toBe('⌘Q quits the app. Pick other keys.')
    expect(refusal('Mod+H', 'everywhere', 'darwin')).toMatch(/hides the app/)
    expect(refusal('Mod+Q', 'workspace', 'win32')).toBeNull()
    expect(refusal('Alt+F4', 'workspace', 'win32')).toMatch(/closes the window/)
  })

  it('refuses editing keys everywhere, in any modifier order', () => {
    expect(refusal('Mod+C', 'editor', 'linux')).toBe('Ctrl+C copies. Pick other keys.')
    expect(refusal('Mod+V', 'patterns', 'darwin')).toMatch(/pastes/)
    expect(refusal('Shift+Mod+Z', 'workspace', 'darwin')).toMatch(/redoes/)
  })

  it('needs Mod or Alt for app-wide shortcuts, except function keys', () => {
    expect(refusal('K', 'workspace', 'darwin')).toMatch(/Hold Cmd or Option/)
    expect(refusal('Shift+K', 'everywhere', 'linux')).toMatch(/Hold Ctrl or Alt/)
    expect(refusal('Enter', 'editor', 'linux')).not.toBeNull()
    expect(refusal('Tab', 'patterns', 'linux')).toMatch(/moves focus/)
    expect(refusal('F5', 'workspace', 'linux')).toBeNull()
    expect(refusal('Alt+K', 'workspace', 'darwin')).toBeNull()
  })

  it('lets Patterns, the tour, the tutor and setup take plain keys', () => {
    expect(refusal('K', 'patterns', 'darwin')).toBeNull()
    expect(refusal('ArrowDown', 'tour', 'darwin')).toBeNull()
    expect(refusal('Shift+Enter', 'chat', 'linux')).toBeNull()
  })

  it('accepts every default', () => {
    const refused = Object.entries(SHORTCUTS).flatMap(([id, s]) =>
      ['darwin', 'win32'].flatMap((p) => (refusal(s.keys, s.scope, p) ? [`${id} on ${p}`] : []))
    )
    expect(refused).toEqual([])
  })
})

describe('applyOverrides', () => {
  it('uses the saved keys, drops the extra ones and ignores unknown ids', () => {
    const shortcuts = applyOverrides({ check: 'Mod+K', shortcutList: 'Mod+Alt+/', gone: 'Mod+G' })
    expect(shortcuts.check).toEqual({ ...SHORTCUTS.check, keys: 'Mod+K' })
    expect(keysOf(shortcuts.shortcutList)).toEqual(['Mod+Alt+/'])
    expect(shortcuts.save).toBe(SHORTCUTS.save)
    expect('gone' in shortcuts).toBe(false)
  })

  it('ignores what is not keys', () => {
    expect(applyOverrides({ check: 4, save: '' }).check).toBe(SHORTCUTS.check)
    expect(applyOverrides(null).save).toBe(SHORTCUTS.save)
  })

  it('is what the registry helpers read', () => {
    setShortcutOverrides({ check: 'Mod+K' })
    expect(isShortcut(press('k', { metaKey: true }), 'check')).toBe(true)
    expect(isShortcut(press('Enter', { metaKey: true }), 'check')).toBe(false)
    expect(isAppShortcut(press('Enter', { metaKey: true }))).toBe(false)
    setShortcutOverrides({})
    expect(isShortcut(press('Enter', { metaKey: true }), 'check')).toBe(true)
  })
})

describe('conflictOf', () => {
  const defaults = applyOverrides({})

  it('finds a shortcut with the same keys whose scope can be live together', () => {
    expect(conflictOf(defaults, 'check', 'Mod+J')).toBe('toggleTerminal')
    expect(conflictOf(defaults, 'save', 'Shift+Mod+Enter')).toBe('runCommand')
    expect(conflictOf(defaults, 'check', 'Mod+Shift+/')).toBe('shortcutList')
  })

  it('ignores scopes that are never live together and the shortcut itself', () => {
    expect(conflictOf(defaults, 'continueSetup', 'Space')).toBeNull()
    expect(conflictOf(defaults, 'playPause', 'Enter')).toBeNull()
    expect(conflictOf(defaults, 'check', 'Mod+Enter')).toBeNull()
  })

  it('sees the keys a person picked', () => {
    const shortcuts = applyOverrides({ toggleTerminal: 'Mod+K' })
    expect(conflictOf(shortcuts, 'check', 'Mod+J')).toBeNull()
    expect(conflictOf(shortcuts, 'check', 'Mod+K')).toBe('toggleTerminal')
  })
})

describe('withKeys', () => {
  it('keeps an override only while it differs from the default', () => {
    expect(withKeys({}, 'check', 'Mod+K')).toEqual({ check: 'Mod+K' })
    expect(withKeys({ check: 'Mod+K' }, 'check', 'Mod+Enter')).toEqual({})
  })
})

describe('swapKeys', () => {
  it('gives the other shortcut the old keys', () => {
    expect(swapKeys({}, 'check', 'toggleTerminal', 'Mod+J', 'darwin')).toEqual({
      check: 'Mod+J',
      toggleTerminal: 'Mod+Enter'
    })
  })

  it('swaps back to the defaults with no overrides left', () => {
    const swapped = { check: 'Mod+J', toggleTerminal: 'Mod+Enter' }
    expect(swapKeys(swapped, 'check', 'toggleTerminal', 'Mod+Enter', 'darwin')).toEqual({})
  })

  it('refuses a swap that leaves the other shortcut on keys it cannot take', () => {
    const overrides = { playPause: 'Mod+,' }
    expect(swapKeys({}, 'playPause', 'openSettings', 'Mod+,', 'darwin')).toBeNull()
    expect(swapKeys(overrides, 'stepBack', 'playPause', 'Mod+,', 'darwin')).toBeNull()
  })
})
