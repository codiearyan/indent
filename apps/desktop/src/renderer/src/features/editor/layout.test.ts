import { describe, expect, it } from 'vitest'
import {
  activeOf,
  closeInGroup,
  dropFile,
  initialLayout,
  openInGroup,
  openToSide,
  pruneLayout,
  renameInLayout,
  storedTabs,
  type EditorLayout
} from './layout'
import type { OpenTabs } from './tabs'

const tabs = (paths: string[], active: string | null = paths[0] ?? null): OpenTabs => ({
  paths,
  active
})

const layout = (groups: OpenTabs[], focused = 0, split = 50): EditorLayout => ({
  groups,
  focused,
  split
})

describe('openToSide', () => {
  it('makes a second group on the right with the file and focuses it', () => {
    expect(openToSide(layout([tabs(['a', 'b'], 'b')]), 'b')).toEqual(
      layout([tabs(['a', 'b'], 'b'), tabs(['b'])], 1)
    )
  })

  it('opens in the other group when there are two', () => {
    const two = layout([tabs(['a']), tabs(['b'])], 1)
    expect(openToSide(two, 'c')).toEqual(layout([tabs(['a', 'c'], 'c'), tabs(['b'])], 0))
    expect(openToSide(two, 'a', 0)).toEqual(layout([tabs(['a']), tabs(['b', 'a'], 'a')], 1))
  })
})

describe('dropFile', () => {
  it('splits with the file on the right when dropped beside the only group', () => {
    expect(dropFile(layout([tabs(['a'])]), 'b', 'side')).toEqual(
      layout([tabs(['a']), tabs(['b'])], 1)
    )
  })

  it('moves a dragged tab to the other group', () => {
    const two = layout([tabs(['a', 'b'], 'b'), tabs(['c'])])
    expect(dropFile(two, 'b', 1, 0)).toEqual(layout([tabs(['a'], 'a'), tabs(['c', 'b'], 'b')], 1))
  })

  it('closes the group a moved tab leaves empty', () => {
    expect(dropFile(layout([tabs(['a'])]), 'a', 'side', 0)).toEqual(layout([tabs(['a'])], 0))
  })

  it('only opens a tab dropped back on its own group', () => {
    const two = layout([tabs(['a', 'b'], 'a'), tabs(['c'])], 1)
    expect(dropFile(two, 'b', 0, 0)).toEqual(layout([tabs(['a', 'b'], 'b'), tabs(['c'])], 0))
  })

  it('opens a file from the files panel in the group it is dropped on', () => {
    const two = layout([tabs(['a']), tabs(['c'])])
    expect(dropFile(two, 'd', 1)).toEqual(layout([tabs(['a']), tabs(['c', 'd'], 'd')], 1))
  })
})

describe('openInGroup', () => {
  it('opens in the focused group only', () => {
    const two = layout([tabs(['a']), tabs(['b'])], 1)
    expect(openInGroup(two, 'c')).toEqual(layout([tabs(['a']), tabs(['b', 'c'], 'c')], 1))
    expect(activeOf(openInGroup(two, 'c'))).toBe('c')
  })
})

describe('closeInGroup', () => {
  it('closes the tab in that group and keeps the other', () => {
    const two = layout([tabs(['a', 'b']), tabs(['a'])], 0)
    expect(closeInGroup(two, 'a')).toEqual(layout([tabs(['b']), tabs(['a'])], 0))
  })

  it('closes a group when its last tab closes', () => {
    expect(closeInGroup(layout([tabs(['a']), tabs(['b'])], 1), 'b')).toEqual(
      layout([tabs(['a'])], 0)
    )
  })

  it('moves the right group to the left when the left one closes', () => {
    expect(closeInGroup(layout([tabs(['a']), tabs(['b'])], 1), 'a', 0)).toEqual(
      layout([tabs(['b'])], 0)
    )
  })

  it('keeps one empty group when the last tab of all closes', () => {
    expect(closeInGroup(layout([tabs(['a'])]), 'a')).toEqual(layout([tabs([], null)]))
  })
})

describe('pruneLayout', () => {
  it('closes tabs of files that are gone in both groups', () => {
    const two = layout([tabs(['a', 'b'], 'b'), tabs(['b', 'c'], 'b')], 1)
    expect(pruneLayout(two, ['a', 'c'])).toEqual(layout([tabs(['a']), tabs(['c'])], 1))
  })

  it('closes a group whose files are all gone', () => {
    const two = layout([tabs(['a']), tabs(['b'])], 1)
    expect(pruneLayout(two, ['a'])).toEqual(layout([tabs(['a'])], 0))
  })
})

describe('renameInLayout', () => {
  it('follows a renamed file or folder in both groups', () => {
    const two = layout([tabs(['src/a.js', 'b.js'], 'src/a.js'), tabs(['src/a.js'])], 1)
    expect(renameInLayout(two, 'src', 'lib')).toEqual(
      layout([tabs(['lib/a.js', 'b.js'], 'lib/a.js'), tabs(['lib/a.js'])], 1)
    )
  })
})

describe('initialLayout', () => {
  const existing = ['a', 'b', 'c']

  it('loads a layout from before the split as one group', () => {
    expect(initialLayout(tabs(['a', 'b'], 'b'), ['a'], existing)).toEqual(
      layout([tabs(['a', 'b'], 'b')])
    )
  })

  it('restores the second group and the divider', () => {
    const stored = { ...tabs(['a']), side: tabs(['b', 'c'], 'c'), split: 35 }
    expect(initialLayout(stored, ['a'], existing)).toEqual(
      layout([tabs(['a']), tabs(['b', 'c'], 'c')], 0, 35)
    )
  })

  it('drops a second group whose files are gone', () => {
    const stored = { ...tabs(['a']), side: tabs(['gone']) }
    expect(initialLayout(stored, ['a'], existing)).toEqual(layout([tabs(['a'])]))
  })

  it('keeps the divider inside its limits', () => {
    expect(initialLayout({ ...tabs(['a']), split: 5 }, [], existing).split).toBe(20)
  })

  it('opens the issue files on a first open', () => {
    expect(initialLayout(undefined, ['b', 'a'], existing)).toEqual(layout([tabs(['b', 'a'])]))
  })
})

describe('storedTabs', () => {
  it('stores one group the way it always was', () => {
    expect(storedTabs(layout([tabs(['a'])]))).toEqual(tabs(['a']))
  })

  it('stores the second group and the divider', () => {
    expect(storedTabs(layout([tabs(['a']), tabs(['b'])], 1, 40))).toEqual({
      ...tabs(['a']),
      side: tabs(['b']),
      split: 40
    })
  })
})
