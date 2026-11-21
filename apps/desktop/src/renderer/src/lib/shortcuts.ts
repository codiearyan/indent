import type * as Monaco from 'monaco-editor'

export type ShortcutScope =
  'everywhere' | 'editor' | 'workspace' | 'patterns' | 'tour' | 'chat' | 'onboarding'

interface Shortcut {
  label: string
  /** `Mod` is Cmd on macOS and Ctrl elsewhere, e.g. `Mod+Shift+K`. */
  keys: string
  scope: ShortcutScope
}

export const SHORTCUTS = {
  openSettings: { label: 'Open settings', keys: 'Mod+,', scope: 'everywhere' },
  save: { label: 'Save', keys: 'Mod+S', scope: 'editor' },
  check: { label: 'Run checks', keys: 'Mod+Enter', scope: 'workspace' },
  closeFile: { label: 'Close file', keys: 'Mod+W', scope: 'workspace' },
  runCommand: { label: 'Run the command', keys: 'Mod+Shift+Enter', scope: 'workspace' },
  suggest: { label: 'Ask for a suggestion', keys: 'Alt+\\', scope: 'editor' },
  explainCode: { label: 'Explain this code', keys: 'Mod+Shift+E', scope: 'editor' },
  sendMessage: { label: 'Send', keys: 'Enter', scope: 'chat' },
  playPause: { label: 'Play or pause', keys: 'Space', scope: 'patterns' },
  stepBack: { label: 'Step back', keys: 'ArrowLeft', scope: 'patterns' },
  stepForward: { label: 'Step forward', keys: 'ArrowRight', scope: 'patterns' },
  firstStep: { label: 'First step', keys: 'Home', scope: 'patterns' },
  lastStep: { label: 'Last step', keys: 'End', scope: 'patterns' },
  closeTour: { label: 'Close the tour', keys: 'Escape', scope: 'tour' },
  nextTourStep: { label: 'Next', keys: 'ArrowRight', scope: 'tour' },
  previousTourStep: { label: 'Back', keys: 'ArrowLeft', scope: 'tour' },
  continueSetup: { label: 'Continue', keys: 'Enter', scope: 'onboarding' }
} satisfies Record<string, Shortcut>

export type ShortcutId = keyof typeof SHORTCUTS

type Modifier = 'Mod' | 'Alt' | 'Shift'

const MAC_ORDER: Modifier[] = ['Alt', 'Shift', 'Mod']
const OTHER_ORDER: Modifier[] = ['Mod', 'Alt', 'Shift']

const MAC_MODIFIERS: Record<Modifier, string> = { Alt: '⌥', Shift: '⇧', Mod: '⌘' }
const MAC_KEYS: Record<string, string> = {
  Enter: '↵',
  Escape: 'Esc',
  ArrowLeft: '←',
  ArrowRight: '→'
}
const OTHER_MODIFIERS: Record<Modifier, string> = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift' }
const OTHER_KEYS: Record<string, string> = { Escape: 'Esc' }

function parse(keys: string): { modifiers: Modifier[]; key: string } {
  const parts = keys.split('+')
  const key = parts.pop() ?? ''
  return { modifiers: parts as Modifier[], key }
}

/** Writes keys the way the platform does: `⌥⇧⌘K` on macOS, `Ctrl+Alt+Shift+K` elsewhere. */
export function formatKeys(keys: string, platform: string): string {
  const { modifiers, key } = parse(keys)
  const name = key.length === 1 ? key.toUpperCase() : key
  if (platform === 'darwin') {
    const mods = MAC_ORDER.filter((m) => modifiers.includes(m)).map((m) => MAC_MODIFIERS[m])
    return mods.join('') + (MAC_KEYS[name] ?? name)
  }
  const mods = OTHER_ORDER.filter((m) => modifiers.includes(m)).map((m) => OTHER_MODIFIERS[m])
  return [...mods, OTHER_KEYS[name] ?? name].join('+')
}

type KeyEvent = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

const CODES: Record<string, string> = { '/': 'Slash', ',': 'Comma', '\\': 'Backslash' }

function codeFor(key: string): string | undefined {
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`
  if (/^\d$/.test(key)) return `Digit${key}`
  return CODES[key]
}

/**
 * Whether the event presses exactly these keys: every modifier named is held and no other.
 * `Mod` accepts Cmd or Ctrl on every platform. Shift and Alt change the character a key types
 * (Shift+1 types `!`), so with either held the physical key counts as well.
 */
export function matchesKeys(event: KeyEvent, keys: string): boolean {
  const { modifiers, key } = parse(keys)
  if ((event.metaKey || event.ctrlKey) !== modifiers.includes('Mod')) return false
  if (event.altKey !== modifiers.includes('Alt')) return false
  if (event.shiftKey !== modifiers.includes('Shift')) return false
  const pressed = event.key === ' ' ? 'Space' : event.key
  if (pressed.toLowerCase() === key.toLowerCase()) return true
  return (event.shiftKey || event.altKey) && event.code === codeFor(key)
}

const MONACO_KEYS: Record<string, keyof typeof Monaco.KeyCode> = {
  Enter: 'Enter',
  Escape: 'Escape',
  Space: 'Space',
  '\\': 'Backslash',
  ',': 'Comma'
}

/** The Monaco keybinding for these keys, for `editor.addCommand`. */
export function toMonacoKeys(
  keys: string,
  monaco: Pick<typeof Monaco, 'KeyMod' | 'KeyCode'>
): number {
  const { modifiers, key } = parse(keys)
  const code = /^[a-z0-9]$/i.test(key)
    ? (`${/\d/.test(key) ? 'Digit' : 'Key'}${key.toUpperCase()}` as keyof typeof Monaco.KeyCode)
    : MONACO_KEYS[key]
  if (!code) throw new Error(`No Monaco key for ${keys}`)
  const mods: Record<Modifier, number> = {
    Mod: monaco.KeyMod.CtrlCmd,
    Alt: monaco.KeyMod.Alt,
    Shift: monaco.KeyMod.Shift
  }
  return modifiers.reduce((binding, m) => binding | mods[m], monaco.KeyCode[code] as number)
}

export function shortcutLabel(id: ShortcutId): string {
  return formatKeys(SHORTCUTS[id].keys, window.platform)
}

export function isShortcut(event: KeyEvent, id: ShortcutId): boolean {
  return matchesKeys(event, SHORTCUTS[id].keys)
}

export function monacoShortcut(
  id: ShortcutId,
  monaco: Pick<typeof Monaco, 'KeyMod' | 'KeyCode'>
): number {
  return toMonacoKeys(SHORTCUTS[id].keys, monaco)
}
