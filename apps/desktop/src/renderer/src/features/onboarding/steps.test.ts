import { describe, expect, it } from 'vitest'
import { STEPS, nextStep, prevStep, progressCells } from './steps'

describe('nextStep and prevStep', () => {
  it('walk the four steps forward and stop after the last', () => {
    expect(STEPS).toEqual(['welcome', 'goal', 'ai', 'editor'])
    expect(nextStep('welcome')).toBe('goal')
    expect(nextStep('goal')).toBe('ai')
    expect(nextStep('ai')).toBe('editor')
    expect(nextStep('editor')).toBeNull()
  })

  it('walk back and stop before the first', () => {
    expect(prevStep('editor')).toBe('ai')
    expect(prevStep('ai')).toBe('goal')
    expect(prevStep('goal')).toBe('welcome')
    expect(prevStep('welcome')).toBeNull()
  })
})

describe('progressCells', () => {
  it('fills a cell for every step already passed', () => {
    expect(progressCells('welcome').map((c) => c.done)).toEqual([false, false, false, false])
    expect(progressCells('goal').map((c) => c.done)).toEqual([true, false, false, false])
    expect(progressCells('editor').map((c) => c.done)).toEqual([true, true, true, false])
  })

  it('fills the last cell once the setup is complete', () => {
    expect(progressCells('editor', true).map((c) => c.done)).toEqual([true, true, true, true])
  })
})
