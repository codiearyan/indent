import { describe, expect, it } from 'vitest'
import { paneAfter } from './paneFocus'

/** A stand-in element: inside a pane, a dialog, or neither. */
function at(where: { pane?: string; dialog?: boolean }): Element {
  return {
    closest: (selector: string) => {
      if (selector.includes('dialog')) return where.dialog ? {} : null
      return where.pane ? { dataset: { pane: where.pane } } : null
    }
  } as unknown as Element
}

describe('paneAfter', () => {
  it('moves to the pane that got focus or a press', () => {
    expect(paneAfter(at({ pane: 'terminal' }), { pane: 'editor-0', held: null })).toEqual({
      pane: 'terminal',
      held: null
    })
  })

  it('leaves the mark where it is for controls outside the panes', () => {
    const state = { pane: 'lesson' as const, held: null }
    expect(paneAfter(at({}), state)).toBe(state)
    expect(paneAfter(null, state)).toBe(state)
  })

  it('takes the mark away while a dialog has focus and gives it back after', () => {
    const inDialog = paneAfter(at({ dialog: true }), { pane: 'editor-1', held: null })
    expect(inDialog).toEqual({ pane: null, held: 'editor-1' })
    expect(paneAfter(at({ dialog: true }), inDialog)).toEqual(inDialog)
    expect(paneAfter(at({}), inDialog)).toEqual({ pane: 'editor-1', held: null })
    expect(paneAfter(at({ pane: 'tutor' }), inDialog)).toEqual({ pane: 'tutor', held: null })
  })
})
