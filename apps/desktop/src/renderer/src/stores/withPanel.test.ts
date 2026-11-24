import { describe, expect, it } from 'vitest'
import { withPanel } from './withPanel'

const panels = {
  files: false,
  terminal: false,
  chat: true,
  zen: false,
  browser: true,
  focusTasks: true
}

describe('withPanel', () => {
  it('closes the tutor when focus mode turns on', () => {
    expect(withPanel(panels, 'zen', true)).toMatchObject({ zen: true, chat: false })
  })

  it('opens the tutor inside focus mode without leaving it', () => {
    const focused = withPanel(panels, 'zen', true)
    expect(withPanel(focused, 'chat', true)).toMatchObject({ zen: true, chat: true })
  })

  it('leaves the tutor alone when focus mode turns off', () => {
    const both = { ...panels, zen: true, chat: true }
    expect(withPanel(both, 'zen', false)).toMatchObject({ zen: false, chat: true })
  })
})
