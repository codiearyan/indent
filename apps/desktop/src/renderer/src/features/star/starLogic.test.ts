import { describe, expect, it } from 'vitest'
import { shouldAskForStar } from './starLogic'

const base = { answered: false, shownThisRun: false, launches: 1, closedRepo: false }

describe('shouldAskForStar', () => {
  it('asks after a repo was closed, or from the second launch', () => {
    expect(shouldAskForStar(base)).toBe(false)
    expect(shouldAskForStar({ ...base, closedRepo: true })).toBe(true)
    expect(shouldAskForStar({ ...base, launches: 2 })).toBe(true)
  })

  it('never asks again once answered, and only once a run', () => {
    expect(shouldAskForStar({ ...base, launches: 3, answered: true })).toBe(false)
    expect(shouldAskForStar({ ...base, closedRepo: true, shownThisRun: true })).toBe(false)
  })
})
