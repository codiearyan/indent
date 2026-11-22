export type PaneId = 'lesson' | 'files' | 'editor-0' | 'editor-1' | 'terminal' | 'browser' | 'tutor'

export interface ActivePane {
  /** The pane that takes typing and pane shortcuts now; null while a dialog has focus. */
  pane: PaneId | null
  /** The pane to mark again once a dialog closes. */
  held: PaneId | null
}

/**
 * Where a press or focus lands decides the active pane. A dialog takes the mark away until focus
 * comes back out; controls outside every pane (the top bar, toolbars, menus) leave it where it is.
 */
export function paneAfter(target: Element | null, state: ActivePane): ActivePane {
  if (target?.closest('[role="dialog"], [role="alertdialog"]')) {
    return { pane: null, held: state.pane ?? state.held }
  }
  const pane = target?.closest<HTMLElement>('[data-pane]')?.dataset.pane as PaneId | undefined
  if (pane) return { pane, held: null }
  if (state.held) return { pane: state.held, held: null }
  return state
}
