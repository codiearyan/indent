import { closeTab, initialTabs, NO_TABS, openTab, pruneTabs, type OpenTabs } from './tabs'

/** One or two editor groups side by side, each with its own tabs. */
export interface EditorLayout {
  groups: OpenTabs[]
  /** The group that has focus; its active file is the active file. */
  focused: number
  /** Width of the first group, in percent of both. */
  split: number
}

/** What is remembered per issue. A layout from before the split has no `side`. */
export interface StoredTabs extends OpenTabs {
  side?: OpenTabs
  split?: number
}

export const DEFAULT_SPLIT = 50
export const MIN_SPLIT = 20

export const NO_LAYOUT: EditorLayout = { groups: [NO_TABS], focused: 0, split: DEFAULT_SPLIT }

export function activeOf(layout: EditorLayout): string | null {
  return layout.groups[layout.focused]?.active ?? null
}

function withGroups(layout: EditorLayout, groups: OpenTabs[], focused: number): EditorLayout {
  // A group left without tabs closes, unless it is the only one.
  const kept = groups.length > 1 ? groups.filter((g) => g.paths.length > 0) : groups
  if (kept.length === 0) return { ...layout, groups: [NO_TABS], focused: 0 }
  const target = groups[focused]
  const index = target ? kept.indexOf(target) : -1
  return { ...layout, groups: kept, focused: index === -1 ? 0 : index }
}

export function openInGroup(
  layout: EditorLayout,
  path: string,
  group = layout.focused
): EditorLayout {
  const groups = layout.groups.map((g, i) => (i === group ? openTab(g, path) : g))
  return { ...layout, groups, focused: group }
}

/** Opens a file in the other group, making a second group on the right when there is one only. */
export function openToSide(
  layout: EditorLayout,
  path: string,
  from = layout.focused
): EditorLayout {
  if (layout.groups.length === 1) {
    return { ...layout, groups: [layout.groups[0], openTab(NO_TABS, path)], focused: 1 }
  }
  return openInGroup(layout, path, from === 0 ? 1 : 0)
}

/** Where a dragged file lands: a group, or a new group on the right of the only one. */
export type DropTarget = number | 'side'

/** A file dropped on the editor. A tab dragged from another group (`from`) leaves that group. */
export function dropFile(
  layout: EditorLayout,
  path: string,
  target: DropTarget,
  from?: number
): EditorLayout {
  const to = target === 'side' ? layout.groups.length : target
  const opened = target === 'side' ? openToSide(layout, path) : openInGroup(layout, path, to)
  return from === undefined || from === to ? opened : closeInGroup(opened, path, from)
}

export function closeInGroup(
  layout: EditorLayout,
  path: string,
  group = layout.focused
): EditorLayout {
  const groups = layout.groups.map((g, i) => (i === group ? closeTab(g, path) : g))
  return withGroups(layout, groups, layout.focused)
}

export function focusGroup(layout: EditorLayout, group: number): EditorLayout {
  return group < layout.groups.length ? { ...layout, focused: group } : layout
}

/** Closes the tabs of files that are gone in every group. */
export function pruneLayout(layout: EditorLayout, existing: string[]): EditorLayout {
  return withGroups(
    layout,
    layout.groups.map((g) => pruneTabs(g, existing)),
    layout.focused
  )
}

export function clampSplit(split: number): number {
  return Math.min(100 - MIN_SPLIT, Math.max(MIN_SPLIT, split))
}

/** The layout when an issue opens, from what was remembered for it. */
export function initialLayout(
  remembered: StoredTabs | undefined,
  chapterFiles: string[],
  existing: string[]
): EditorLayout {
  const main = initialTabs(remembered, chapterFiles, existing)
  const side = remembered?.side && pruneTabs(remembered.side, existing)
  const split = clampSplit(remembered?.split ?? DEFAULT_SPLIT)
  const groups = side && side.paths.length > 0 ? [main, side] : [main]
  return withGroups({ groups, focused: 0, split }, groups, 0)
}

export function storedTabs({ groups, split }: EditorLayout): StoredTabs {
  const [main, side] = groups
  const stored: StoredTabs = { paths: main.paths, active: main.active }
  if (side) stored.side = { paths: side.paths, active: side.active }
  if (split !== DEFAULT_SPLIT) stored.split = split
  return stored
}
