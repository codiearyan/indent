import { mergeSettings } from './mergeSettings'
import type { SettingsState, Theme } from './settings'

/** Settings that go into a backup. The rest belongs to one computer (IDE, launches, version). */
const PORTABLE = [
  'appearance',
  'codeTheme',
  'editor',
  'textScale',
  'typography',
  'panels',
  'lessonSide',
  'leftTab',
  'resourcesShown',
  'learnFirst',
  'videosWatched',
  'tourSeen',
  'starAsked',
  'telemetry',
  'autoUpdate',
  'goals',
  'experience',
  'dsaWatched',
  'shortcuts'
] as const satisfies readonly (keyof SettingsState)[]

const CHOICES: Partial<Record<(typeof PORTABLE)[number], readonly unknown[]>> = {
  appearance: ['dark', 'light', 'system'],
  lessonSide: ['left', 'right'],
  leftTab: ['insights', 'tasks', 'resources'],
  learnFirst: ['reading', 'videos'],
  experience: ['new', 'some', 'experienced', null]
}

const kind = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value

export function portableSettings(state: SettingsState): Record<string, unknown> {
  return Object.fromEntries(PORTABLE.map((key) => [key, state[key]]))
}

/** `current` with the settings of a backup; a value of the wrong kind keeps the current one. */
export function withBackupSettings(
  current: SettingsState,
  saved: Record<string, unknown>,
  system: Theme
): SettingsState {
  const valid = PORTABLE.filter((key) => {
    if (!(key in saved)) return false
    const choices = CHOICES[key]
    return choices ? choices.includes(saved[key]) : kind(saved[key]) === kind(current[key])
  })
  const picked = Object.fromEntries(valid.map((key) => [key, saved[key]]))
  return mergeSettings({ ...current, ...picked }, current, system)
}
