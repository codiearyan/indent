import { useEffect } from 'react'
import { create } from 'zustand'
import { focusEditorSoon } from '@/features/editor/editors'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { paneAfter, type ActivePane, type PaneId } from './paneFocus'

export type { PaneId }

export const useActivePane = create<ActivePane>()(() => ({ pane: null, held: null }))

/** The props of an editor group, the one pane that draws the active mark. */
export function usePane(id: PaneId): { 'data-pane': PaneId; 'data-active': boolean } {
  const active = useActivePane((s) => s.pane === id)
  return { 'data-pane': id, 'data-active': active }
}

const DIALOG = '[role="dialog"], [role="alertdialog"]'

/** Puts focus back in a pane: the editor, the terminal, the tutor's box, or the selected item. */
function focusPane(id: PaneId): void {
  if (id === 'editor-0' || id === 'editor-1') return focusEditorSoon()
  requestAnimationFrame(() =>
    document
      .querySelector(`[data-pane="${id}"]`)
      ?.querySelector<HTMLElement>(
        '.xterm-helper-textarea, #tutor-input, [role="tab"][aria-selected="true"], [role="treeitem"][tabindex="0"]'
      )
      ?.focus()
  )
}

/** Follows focus and presses into the panes, and moves focus to the editor when a pane closes. */
export function useActivePaneTracking(): void {
  useEffect(() => {
    const follow = (event: Event): void => {
      const next = paneAfter(event.target as Element | null, useActivePane.getState())
      const { pane, held } = useActivePane.getState()
      if (next.pane !== pane || next.held !== held) useActivePane.setState(next)
    }
    document.addEventListener('focusin', follow)
    document.addEventListener('pointerdown', follow, true)
    useActivePane.setState(paneAfter(document.activeElement, useActivePane.getState()))
    // A dialog opened from the keyboard can leave focus nowhere when it closes. Once the last
    // one is gone, the pane it covered gets the mark and focus back.
    const dialogs = new MutationObserver(() => {
      const { pane, held } = useActivePane.getState()
      if (pane || !held || document.querySelector(DIALOG)) return
      const focus = document.activeElement
      if (focus && focus !== document.body) return
      useActivePane.setState({ pane: held, held: null })
      focusPane(held)
    })
    dialogs.observe(document.body, { childList: true })
    // Focus left in a pane that just closed would type into nothing; the editor takes it.
    const stopSettings = useSettings.subscribe((s, previous) => {
      const { pane } = useActivePane.getState()
      const closed =
        (pane === 'terminal' && previous.panels.terminal && !s.panels.terminal) ||
        (pane === 'files' && previous.panels.files && !s.panels.files) ||
        (pane === 'lesson' && !previous.panels.zen && s.panels.zen)
      if (closed) focusEditorSoon()
    })
    const stopWorkspace = useWorkspace.subscribe((s) => {
      const { pane } = useActivePane.getState()
      if (pane === 'editor-1' && s.layout.groups.length < 2) focusEditorSoon()
    })
    return () => {
      document.removeEventListener('focusin', follow)
      document.removeEventListener('pointerdown', follow, true)
      dialogs.disconnect()
      stopSettings()
      stopWorkspace()
      useActivePane.setState({ pane: null, held: null })
    }
  }, [])
}
