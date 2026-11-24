import type { PanelKey } from './settings'

/** Turning focus mode on closes the tutor; the tutor may still be opened inside focus mode. */
export function withPanel(
  panels: Record<PanelKey, boolean>,
  key: PanelKey,
  open: boolean
): Record<PanelKey, boolean> {
  return { ...panels, [key]: open, ...(key === 'zen' && open ? { chat: false } : {}) }
}
