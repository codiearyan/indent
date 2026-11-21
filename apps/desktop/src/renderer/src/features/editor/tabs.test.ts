import { describe, expect, it } from 'vitest'
import { closeTab, initialTabs, openTab, pruneTabs, type OpenTabs } from './tabs'

const tabs = (paths: string[], active: string | null = paths[0] ?? null): OpenTabs => ({
  paths,
  active
})

describe('openTab', () => {
  it('appends a file that is not open and makes it active', () => {
    expect(openTab(tabs(['a.js', 'b.js']), 'c.js')).toEqual(tabs(['a.js', 'b.js', 'c.js'], 'c.js'))
  })

  it('keeps the order when the file is already open', () => {
    expect(openTab(tabs(['a.js', 'b.js']), 'b.js')).toEqual(tabs(['a.js', 'b.js'], 'b.js'))
  })
})

describe('closeTab', () => {
  it('moves to the right-hand neighbour of the active tab', () => {
    expect(closeTab(tabs(['a', 'b', 'c'], 'b'), 'b')).toEqual(tabs(['a', 'c'], 'c'))
  })

  it('moves to the left neighbour when the active tab is the last one', () => {
    expect(closeTab(tabs(['a', 'b', 'c'], 'c'), 'c')).toEqual(tabs(['a', 'b'], 'b'))
  })

  it('keeps the active tab when another one closes', () => {
    expect(closeTab(tabs(['a', 'b', 'c'], 'a'), 'c')).toEqual(tabs(['a', 'b'], 'a'))
  })

  it('leaves nothing active after the last tab closes', () => {
    expect(closeTab(tabs(['a']), 'a')).toEqual(tabs([], null))
  })

  it('ignores a file that is not open', () => {
    const open = tabs(['a', 'b'])
    expect(closeTab(open, 'z')).toBe(open)
  })
})

describe('pruneTabs', () => {
  it('closes the tabs of files that are gone', () => {
    expect(pruneTabs(tabs(['a', 'b', 'c'], 'a'), ['a', 'c'])).toEqual(tabs(['a', 'c'], 'a'))
  })

  it('moves to a neighbour when the active file is gone', () => {
    expect(pruneTabs(tabs(['a', 'b', 'c'], 'b'), ['a', 'c'])).toEqual(tabs(['a', 'c'], 'c'))
  })

  it('drops an active file that is gone even when it was not a tab', () => {
    expect(pruneTabs(tabs(['a', 'b'], 'z'), ['a', 'b'])).toEqual(tabs(['a', 'b'], 'a'))
  })
})

describe('initialTabs', () => {
  const existing = ['index.js', 'report.js', 'notes.md']

  it('opens the issue files that exist, in their order, on a first open', () => {
    expect(initialTabs(undefined, ['report.js', 'missing.js', 'index.js'], existing)).toEqual(
      tabs(['report.js', 'index.js'], 'report.js')
    )
  })

  it('restores the remembered tabs without the files that are gone', () => {
    const remembered = tabs(['notes.md', 'gone.js', 'index.js'], 'index.js')
    expect(initialTabs(remembered, ['report.js'], existing)).toEqual(
      tabs(['notes.md', 'index.js'], 'index.js')
    )
  })

  it('keeps every tab closed when that is how the issue was left', () => {
    expect(initialTabs(tabs([]), ['report.js'], existing)).toEqual(tabs([], null))
  })

  it('starts over from the issue files when every remembered file is gone', () => {
    expect(initialTabs(tabs(['gone.js']), ['report.js'], existing)).toEqual(
      tabs(['report.js'], 'report.js')
    )
  })
})
