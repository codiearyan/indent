export interface OpenTabs {
  /** Open files in the order they were opened. */
  paths: string[]
  active: string | null
}

export const NO_TABS: OpenTabs = { paths: [], active: null }

export function openTab(tabs: OpenTabs, path: string): OpenTabs {
  const paths = tabs.paths.includes(path) ? tabs.paths : [...tabs.paths, path]
  return { paths, active: path }
}

/** Closing the active tab moves to its right-hand neighbour, or the left one at the end. */
export function closeTab(tabs: OpenTabs, path: string): OpenTabs {
  const index = tabs.paths.indexOf(path)
  if (index === -1) return tabs
  const paths = tabs.paths.filter((p) => p !== path)
  if (tabs.active !== path) return { paths, active: tabs.active }
  return { paths, active: paths[Math.min(index, paths.length - 1)] ?? null }
}

/** Closes the tabs of files that are gone, as if each had been closed by hand. */
export function pruneTabs(tabs: OpenTabs, existing: string[]): OpenTabs {
  const pruned = tabs.paths.filter((path) => !existing.includes(path)).reduce(closeTab, tabs)
  const active = pruned.active && existing.includes(pruned.active) ? pruned.active : null
  return { paths: pruned.paths, active: active ?? pruned.paths[0] ?? null }
}

/**
 * The tabs when an issue opens: the ones remembered for it, or the issue's own files on a first
 * open. When every remembered file is gone, it starts over from the issue's files.
 */
export function initialTabs(
  remembered: OpenTabs | undefined,
  chapterFiles: string[],
  existing: string[]
): OpenTabs {
  if (remembered) {
    const pruned = pruneTabs(remembered, existing)
    if (pruned.paths.length > 0 || remembered.paths.length === 0) return pruned
  }
  const paths = chapterFiles.filter((path) => existing.includes(path))
  return { paths, active: paths[0] ?? null }
}
