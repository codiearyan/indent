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
  shortcutList: { label: 'Keyboard shortcuts', keys: 'Mod+/', scope: 'everywhere' },
  goHome: { label: 'Go to Home', keys: 'Mod+Alt+1', scope: 'everywhere' },
  goRepos: { label: 'Go to Repos', keys: 'Mod+Alt+2', scope: 'everywhere' },
  goRoadmaps: { label: 'Go to Roadmaps', keys: 'Mod+Alt+3', scope: 'everywhere' },
  goPatterns: { label: 'Go to Patterns', keys: 'Mod+Alt+4', scope: 'everywhere' },
  goActivity: { label: 'Go to Activity', keys: 'Mod+Alt+5', scope: 'everywhere' },
  check: { label: 'Run checks', keys: 'Mod+Enter', scope: 'workspace' },
  runCommand: { label: 'Run the command', keys: 'Mod+Shift+Enter', scope: 'workspace' },
  focusEditor: { label: 'Focus the editor', keys: 'Mod+1', scope: 'workspace' },
  focusLesson: { label: 'Focus the lesson and tasks', keys: 'Mod+2', scope: 'workspace' },
  focusTerminal: { label: 'Focus the terminal', keys: 'Mod+3', scope: 'workspace' },
  toggleTerminal: { label: 'Show or hide the terminal', keys: 'Mod+J', scope: 'workspace' },
  toggleFiles: { label: 'Show or hide the file list', keys: 'Mod+B', scope: 'workspace' },
  toggleFocusMode: { label: 'Focus mode', keys: 'Mod+Shift+F', scope: 'workspace' },
  nextIssue: { label: 'Next issue', keys: 'Mod+Alt+ArrowRight', scope: 'workspace' },
  previousIssue: { label: 'Previous issue', keys: 'Mod+Alt+ArrowLeft', scope: 'workspace' },
  openTutor: { label: 'Open the tutor', keys: 'Mod+Shift+T', scope: 'workspace' },
  nextHint: { label: 'Show the next hint', keys: 'Mod+Shift+H', scope: 'workspace' },
  readAloud: { label: 'Read aloud: play or pause', keys: 'Mod+Shift+P', scope: 'workspace' },
  closeFile: { label: 'Close file', keys: 'Mod+W', scope: 'workspace' },
  save: { label: 'Save', keys: 'Mod+S', scope: 'editor' },
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

interface GuardedEvent extends KeyEvent {
  defaultPrevented: boolean
  repeat: boolean
  target: EventTarget | null
  getModifierState?(key: string): boolean
}

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"], .monaco-editor, .xterm'

/**
 * Ctrl with a letter or a symbol is a control key for the shell (Ctrl+B, Ctrl+J, Ctrl+W), so
 * the terminal keeps it, even where Ctrl is the app's Mod.
 */
export function isShellKey(event: KeyEvent): boolean {
  if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false
  return event.key.length === 1 && !/\d/.test(event.key)
}

/**
 * Whether a window shortcut should leave this key press alone: something focused already
 * handled it (the code editor runs its own bindings), it repeats while held, it was typed with
 * AltGr, a dialog is open, or it has no Mod and focus is where people type. Ctrl and a letter
 * also stay with the terminal, and on macOS with every text field, where they move the cursor.
 */
export function skipsShortcut(event: GuardedEvent, keys: string, platform: string): boolean {
  if (event.defaultPrevented || event.repeat) return true
  if (event.getModifierState?.('AltGraph')) return true
  const inside = (selector: string): boolean =>
    !!(event.target as Partial<Element> | null)?.closest?.(selector)
  if (inside('[role="dialog"], [role="alertdialog"]')) return true
  if (!parse(keys).modifiers.includes('Mod') && inside(TEXT_FIELDS)) return true
  return isShellKey(event) && inside(platform === 'darwin' ? TEXT_FIELDS : '.xterm')
}

/** Whether the app takes this key press from the terminal for one of its own shortcuts. */
export function isAppShortcut(event: KeyEvent): boolean {
  if (isShellKey(event)) return false
  return Object.values(SHORTCUTS).some(
    (s: Shortcut) =>
      (s.scope === 'everywhere' || s.scope === 'workspace') && matchesKeys(event, s.keys)
  )
}
