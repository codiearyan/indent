import { describe, expect, it } from 'vitest'
import { applyOverrides, SHORTCUTS } from '@/lib/shortcuts'
import { shortcutGroups } from './list'

const ids = (groups: ReturnType<typeof shortcutGroups>): string[] =>
  groups.flatMap((g) => g.rows.map((r) => r.id))

describe('shortcutGroups', () => {
  it('lists every shortcut once, grouped by where it works', () => {
    const groups = shortcutGroups('darwin')
    expect(ids(groups).sort()).toEqual(Object.keys(SHORTCUTS).sort())
    expect(groups.map((g) => g.title)).toEqual([
      'Everywhere',
      'Issue',
      'Editor',
      'Tutor',
      'Patterns',
      'Guided tour',
      'Setup'
    ])
    expect(groups[1].rows.map((r) => r.id)).toContain('check')
  })

  it('writes the keys the platform way, every combination of a shortcut', () => {
    const row = (platform: string, id: string): string[] | undefined =>
      shortcutGroups(platform)
        .flatMap((g) => g.rows)
        .find((r) => r.id === id)?.keys
    expect(row('darwin', 'check')).toEqual(['⌘↵'])
    expect(row('win32', 'check')).toEqual(['Ctrl+Enter'])
    expect(row('darwin', 'shortcutList')).toEqual(['⌘/', '⇧⌘/'])
  })

  it('filters by label, ignoring case and spaces around', () => {
    const groups = shortcutGroups('linux', '  NEXT issue ')
    expect(ids(groups)).toEqual(['nextIssue'])
    expect(groups[0].rows[0].keys).toEqual([])
    expect(groups.map((g) => g.title)).toEqual(['Issue'])
  })

  it('filters by the keys as shown and as words', () => {
    expect(ids(shortcutGroups('darwin', '⌘J'))).toEqual(['toggleTerminal'])
    expect(ids(shortcutGroups('linux', 'ctrl+j'))).toEqual(['toggleTerminal'])
    expect(ids(shortcutGroups('darwin', 'cmd+j'))).toEqual(['toggleTerminal'])
    expect(ids(shortcutGroups('darwin', 'option+\\'))).toEqual(['suggest'])
  })

  it('finds nothing for a search nothing matches', () => {
    expect(shortcutGroups('linux', 'no such thing')).toEqual([])
  })
  it('shows and finds the keys a person picked', () => {
    const shortcuts = applyOverrides({ check: 'Mod+K' })
    const groups = shortcutGroups('darwin', '⌘K', shortcuts)
    expect(groups.flatMap((g) => g.rows)).toEqual([
      { id: 'check', label: 'Run checks', keys: ['⌘K'] }
    ])
  })
})
