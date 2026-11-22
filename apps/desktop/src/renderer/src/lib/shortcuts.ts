import type * as Monaco from 'monaco-editor'

export type ShortcutScope =
  'everywhere' | 'editor' | 'workspace' | 'patterns' | 'tour' | 'chat' | 'onboarding'

export interface Shortcut {
  label: string
  /** `Mod` is Cmd on macOS and Ctrl elsewhere, e.g. `Mod+Shift+K`. Empty when it has no keys. */
  keys: string
  /** More keys for the same command, for where the first ones belong to the editor. */
  also?: string
  scope: ShortcutScope
}

export const SHORTCUTS = {
  openSettings: { label: 'Open settings', keys: 'Mod+,', scope: 'everywhere' },
  shortcutList: {
    label: 'Keyboard shortcuts',
    keys: 'Mod+/',
    also: 'Mod+Shift+/',
    scope: 'everywhere'
  },
  goHome: { label: 'Go to Home', keys: '', scope: 'everywhere' },
  goRepos: { label: 'Go to Repos', keys: '', scope: 'everywhere' },
  goRoadmaps: { label: 'Go to Roadmaps', keys: '', scope: 'everywhere' },
  goPatterns: { label: 'Go to Patterns', keys: '', scope: 'everywhere' },
  goActivity: { label: 'Go to Activity', keys: '', scope: 'everywhere' },
  check: { label: 'Run checks', keys: 'Mod+Enter', scope: 'workspace' },
  runCommand: { label: 'Run the command', keys: 'Mod+Shift+Enter', scope: 'workspace' },
  selectTab1: { label: 'Go to tab 1', keys: 'Mod+1', scope: 'workspace' },
  selectTab2: { label: 'Go to tab 2', keys: 'Mod+2', scope: 'workspace' },
  selectTab3: { label: 'Go to tab 3', keys: 'Mod+3', scope: 'workspace' },
  selectTab4: { label: 'Go to tab 4', keys: 'Mod+4', scope: 'workspace' },
  selectTab5: { label: 'Go to tab 5', keys: 'Mod+5', scope: 'workspace' },
  selectTab6: { label: 'Go to tab 6', keys: 'Mod+6', scope: 'workspace' },
  selectTab7: { label: 'Go to tab 7', keys: 'Mod+7', scope: 'workspace' },
  selectTab8: { label: 'Go to tab 8', keys: 'Mod+8', scope: 'workspace' },
  selectTab9: { label: 'Go to tab 9', keys: 'Mod+9', scope: 'workspace' },
  focusEditor: { label: 'Focus the editor', keys: '', scope: 'workspace' },
  focusLesson: { label: 'Focus the lesson and tasks', keys: '', scope: 'workspace' },
  focusTerminal: { label: 'Focus the terminal', keys: '', scope: 'workspace' },
  toggleTerminal: { label: 'Show or hide the terminal', keys: 'Mod+J', scope: 'workspace' },
  toggleFiles: { label: 'Show or hide the file list', keys: 'Mod+B', scope: 'workspace' },
  toggleFocusMode: { label: 'Focus mode', keys: '', scope: 'workspace' },
  expandBrowser: { label: 'Expand or collapse the page', keys: '', scope: 'workspace' },
  nextIssue: { label: 'Next issue', keys: '', scope: 'workspace' },
  previousIssue: { label: 'Previous issue', keys: '', scope: 'workspace' },
  openTutor: { label: 'Show or hide the tutor', keys: 'Mod+Shift+T', scope: 'workspace' },
  nextHint: { label: 'Show the next hint', keys: '', scope: 'workspace' },
  readAloud: { label: 'Read aloud: play or pause', keys: '', scope: 'workspace' },
  closeFile: { label: 'Close file', keys: 'Mod+W', scope: 'workspace' },
  quickOpen: { label: 'Open a file by name', keys: 'Mod+P', scope: 'workspace' },
  openToSide: { label: 'Open to the side', keys: '', scope: 'workspace' },
  save: { label: 'Save', keys: 'Mod+S', scope: 'editor' },
  suggest: { label: 'Ask for a suggestion', keys: 'Alt+\\', scope: 'editor' },
  explainCode: { label: 'Explain this code', keys: 'Mod+Shift+E', scope: 'editor' },
  foldComments: { label: 'Fold or show comments', keys: 'Mod+Shift+C', scope: 'editor' },
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

/** The shortcuts that pick an editor tab by position, the first tab first. */
export const TAB_SHORTCUTS: ShortcutId[] = [
  'selectTab1',
  'selectTab2',
  'selectTab3',
  'selectTab4',
  'selectTab5',
  'selectTab6',
  'selectTab7',
  'selectTab8',
  'selectTab9'
]

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
  if (!keys) return ''
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

const CODES: Record<string, string> = {
  '/': 'Slash',
  ',': 'Comma',
  '\\': 'Backslash',
  '.': 'Period',
  ';': 'Semicolon',
  "'": 'Quote',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '-': 'Minus',
  '=': 'Equal',
  '`': 'Backquote'
}

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
  if (!keys) return false
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
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'UpArrow',
  ArrowDown: 'DownArrow',
  ArrowLeft: 'LeftArrow',
  ArrowRight: 'RightArrow',
  ...Object.fromEntries(
    Object.entries(CODES).map(([key, code]) => [key, code as keyof typeof Monaco.KeyCode])
  )
}

/** The Monaco keybinding for these keys, for `editor.addCommand`. */
export function toMonacoKeys(
  keys: string,
  monaco: Pick<typeof Monaco, 'KeyMod' | 'KeyCode'>
): number {
  const { modifiers, key } = parse(keys)
  let code = MONACO_KEYS[key]
  if (/^[a-z]$/i.test(key)) code = `Key${key.toUpperCase()}` as keyof typeof Monaco.KeyCode
  else if (/^\d$/.test(key)) code = `Digit${key}` as keyof typeof Monaco.KeyCode
  else if (/^F\d{1,2}$/.test(key)) code = key as keyof typeof Monaco.KeyCode
  if (!code) throw new Error(`No Monaco key for ${keys}`)
  const mods: Record<Modifier, number> = {
    Mod: monaco.KeyMod.CtrlCmd,
    Alt: monaco.KeyMod.Alt,
    Shift: monaco.KeyMod.Shift
  }
  return modifiers.reduce((binding, m) => binding | mods[m], monaco.KeyCode[code] as number)
}

/** Every key combination of a shortcut, the main one first. None when it has no keys. */
export function keysOf(shortcut: Shortcut): string[] {
  return [shortcut.keys, shortcut.also ?? ''].filter(Boolean)
}

/**
 * Keys a person picked in Settings, by shortcut id. Only the ones that differ are kept; an empty
 * string means they cleared the keys.
 */
export type ShortcutOverrides = Partial<Record<ShortcutId, string>>

/** The saved overrides that still name a shortcut and hold keys or none; anything else is dropped. */
export function cleanOverrides(saved: unknown): ShortcutOverrides {
  if (!saved || typeof saved !== 'object') return {}
  return Object.fromEntries(
    Object.entries(saved).filter(
      ([id, keys]) => Object.hasOwn(SHORTCUTS, id) && typeof keys === 'string'
    )
  )
}

/** The shortcuts with a person's keys in place of the defaults. New keys replace the extra ones. */
export function applyOverrides(overrides: unknown): Record<ShortcutId, Shortcut> {
  const clean = cleanOverrides(overrides)
  return Object.fromEntries(
    Object.entries(SHORTCUTS).map(([id, s]: [string, Shortcut]) => {
      const keys = clean[id as ShortcutId]
      return [id, keys !== undefined ? { label: s.label, scope: s.scope, keys } : s]
    })
  ) as Record<ShortcutId, Shortcut>
}

/**
 * Keys a person picked stay theirs when a newer default wants the same keys: that default is
 * left with its other keys, or none. Run on saved overrides when settings load.
 */
export function keepPickedKeys(overrides: ShortcutOverrides): ShortcutOverrides {
  const picked = (Object.keys(overrides) as ShortcutId[]).filter((id) => overrides[id])
  const next = { ...overrides }
  for (const [id, shortcut] of Object.entries(SHORTCUTS) as [ShortcutId, Shortcut][]) {
    if (id in overrides) continue
    const free = keysOf(shortcut).filter(
      (keys) =>
        !picked.some(
          (other) =>
            scopesOverlap(shortcut.scope, SHORTCUTS[other].scope) &&
            sameKeys(overrides[other] as string, keys)
        )
    )
    if (free.length < keysOf(shortcut).length) next[id] = free[0] ?? ''
  }
  return next
}

let effective = applyOverrides({})
const listeners = new Set<() => void>()

/** Called by the settings store whenever the saved keys change. */
export function setShortcutOverrides(overrides: unknown): void {
  effective = applyOverrides(overrides)
  listeners.forEach((listener) => listener())
}

/** Runs `listener` after the keys of any shortcut change. Returns the unsubscribe. */
export function onShortcutsChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function shortcutOf(id: ShortcutId): Shortcut {
  return effective[id]
}

export function shortcutLabel(id: ShortcutId): string {
  return formatKeys(effective[id].keys, window.platform)
}

export function isShortcut(event: KeyEvent, id: ShortcutId): boolean {
  return keysOf(effective[id]).some((keys) => matchesKeys(event, keys))
}

/** The Monaco keybindings of a shortcut: one, or none when it has no keys. */
export function monacoKeys(
  id: ShortcutId,
  monaco: Pick<typeof Monaco, 'KeyMod' | 'KeyCode'>
): number[] {
  const { keys } = effective[id]
  return keys ? [toMonacoKeys(keys, monaco)] : []
}

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

export function scopesOverlap(a: ShortcutScope, b: ShortcutScope): boolean {
  return OVERLAPS[a].includes(b)
}

export function sameKeys(a: string, b: string): boolean {
  const normal = (keys: string): string => {
    const parts = keys.toLowerCase().split('+')
    const key = parts.pop()
    return [...parts.sort(), key].join('+')
  }
  return normal(a) === normal(b)
}

/** The first other shortcut that would answer these keys at the same moment as `id`. */
export function conflictOf(
  shortcuts: Record<ShortcutId, Shortcut>,
  id: ShortcutId,
  keys: string
): ShortcutId | null {
  if (!keys) return null
  const { scope } = shortcuts[id]
  const entries = Object.entries(shortcuts) as [ShortcutId, Shortcut][]
  const found = entries.find(
    ([other, s]) =>
      other !== id && scopesOverlap(scope, s.scope) && keysOf(s).some((k) => sameKeys(k, keys))
  )
  return found?.[0] ?? null
}

/** The overrides with `id` on `keys`, dropping the override when the keys are the default. */
export function withKeys(
  overrides: ShortcutOverrides,
  id: ShortcutId,
  keys: string
): ShortcutOverrides {
  const next = { ...overrides, [id]: keys }
  if (sameKeys(keys, SHORTCUTS[id].keys)) delete next[id]
  return next
}

/**
 * Gives `id` the keys `other` has now and `other` the keys `id` had. Null when the old keys do
 * not suit `other` or clash with a third shortcut there.
 */
export function swapKeys(
  overrides: ShortcutOverrides,
  id: ShortcutId,
  other: ShortcutId,
  keys: string,
  platform: string
): ShortcutOverrides | null {
  const shortcuts = applyOverrides(overrides)
  const old = shortcuts[id].keys
  if (refusal(old, shortcuts[other].scope, platform)) return null
  const next = withKeys(withKeys(overrides, id, keys), other, old)
  const after = applyOverrides(next)
  if (conflictOf(after, id, keys) || conflictOf(after, other, old)) return null
  return next
}

const RECORD_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(CODES).map(([key, code]) => [code, key])
)
const NAMED_KEYS = new Set([...Object.keys(MONACO_KEYS).filter((k) => k.length > 1), 'Escape'])
const PLAIN_SCOPES: ShortcutScope[] = ['patterns', 'tour', 'chat', 'onboarding']

/**
 * The keys an event presses, in the registry's format: `Mod` for Cmd on macOS and Ctrl
 * elsewhere, then Alt and Shift. Null while only modifiers are held, or for a key the app cannot
 * bind. Ctrl on macOS and the Windows key elsewhere are left out; they are not app modifiers.
 */
export function keysFromEvent(event: KeyEvent, platform: string): string | null {
  const code = event.code
  let key: string | undefined
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3)
  else if (/^Digit\d$/.test(code)) key = code.slice(5)
  else if (RECORD_CODES[code]) key = RECORD_CODES[code]
  else if (code === 'Space' || event.key === ' ') key = 'Space'
  else if (/^F\d{1,2}$/.test(event.key) || NAMED_KEYS.has(event.key)) key = event.key
  if (!key) return null
  const mod = platform === 'darwin' ? event.metaKey : event.ctrlKey
  const modifiers = [mod && 'Mod', event.altKey && 'Alt', event.shiftKey && 'Shift'].filter(Boolean)
  return [...modifiers, key].join('+')
}

/** Keys no shortcut can take, because the system, the editor or the terminal needs them. */
export const RESERVED_KEYS: { keys: string; platform?: 'darwin' | 'other'; reason: string }[] = [
  { keys: 'Mod+Q', platform: 'darwin', reason: 'quits the app' },
  { keys: 'Mod+H', platform: 'darwin', reason: 'hides the app' },
  { keys: 'Mod+M', platform: 'darwin', reason: 'minimizes the window' },
  { keys: 'Mod+`', platform: 'darwin', reason: 'switches windows' },
  { keys: 'Mod+Tab', platform: 'darwin', reason: 'switches apps' },
  { keys: 'Alt+Tab', platform: 'other', reason: 'switches apps' },
  { keys: 'Alt+F4', platform: 'other', reason: 'closes the window' },
  { keys: 'Mod+C', reason: 'copies' },
  { keys: 'Mod+V', reason: 'pastes' },
  { keys: 'Mod+X', reason: 'cuts' },
  { keys: 'Mod+Z', reason: 'undoes' },
  { keys: 'Mod+Shift+Z', reason: 'redoes' },
  { keys: 'Mod+A', reason: 'selects everything' },
  { keys: 'Mod+F', reason: 'finds in the editor' },
  { keys: 'Mod+D', reason: 'selects the next match in the editor' },
  { keys: 'Mod+L', reason: 'selects a line in the editor and clears the terminal' },
  { keys: 'Mod+]', reason: 'indents in the editor' },
  { keys: 'Mod+[', reason: 'outdents in the editor' },
  { keys: 'F1', reason: 'opens the editor commands' },
  { keys: 'Tab', reason: 'moves focus' },
  { keys: 'Shift+Tab', reason: 'moves focus' }
]

/**
 * Why these keys cannot be a shortcut of this scope, in plain words, or null when they can.
 * App-wide shortcuts need Cmd, Ctrl or Alt, or a function key, so typing never sets them off.
 */
export function refusal(keys: string, scope: ShortcutScope, platform: string): string | null {
  if (!keys) return null
  const shown = formatKeys(keys, platform)
  const kind = platform === 'darwin' ? 'darwin' : 'other'
  const reserved = RESERVED_KEYS.find(
    (r) => (!r.platform || r.platform === kind) && sameKeys(r.keys, keys)
  )
  if (reserved) return `${shown} ${reserved.reason}. Pick other keys.`
  const { modifiers, key } = parse(keys)
  const held = modifiers.includes('Mod') || modifiers.includes('Alt')
  if (held || /^F\d{1,2}$/.test(key) || PLAIN_SCOPES.includes(scope)) return null
  const names = platform === 'darwin' ? 'Cmd or Option' : 'Ctrl or Alt'
  return `Hold ${names} with the key, so typing does not set it off.`
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
  return Object.values(effective).some(
    (s: Shortcut) =>
      (s.scope === 'everywhere' || s.scope === 'workspace') &&
      keysOf(s).some((keys) => matchesKeys(event, keys))
  )
}
