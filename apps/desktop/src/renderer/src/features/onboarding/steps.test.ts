import { describe, expect, it } from 'vitest'
import {
  ALL_STEPS,
  helpLevelFor,
  nextStep,
  prevStep,
  progressCells,
  stepsFor,
  suggestionsFor,
  type HelpLevel
} from './steps'

const withAi = { ai: true }
const without = { ai: false }

describe('stepsFor', () => {
  it('has every step with AI', () => {
    expect(stepsFor(withAi)).toEqual(ALL_STEPS)
  })

  it('leaves out the provider and help steps without AI', () => {
    expect(stepsFor(without)).toEqual(['welcome', 'how', 'ai', 'ready'])
  })
})

describe('nextStep and prevStep', () => {
  it('walk every step with AI', () => {
    const walked = ['welcome']
    let step = nextStep('welcome', withAi)
    while (step) {
      walked.push(step)
      step = nextStep(step, withAi)
    }
    expect(walked).toEqual(ALL_STEPS)
    expect(prevStep('welcome', withAi)).toBeNull()
    expect(prevStep('provider', withAi)).toBe('ai')
  })

  it('jump over the AI steps without AI, both ways', () => {
    expect(nextStep('ai', without)).toBe('ready')
    expect(prevStep('ready', without)).toBe('ai')
    expect(nextStep('ready', without)).toBeNull()
  })

  it('find a way out of a step the choices just removed', () => {
    expect(nextStep('provider', without)).toBe('ready')
    expect(prevStep('help', without)).toBe('ai')
  })
})

describe('progressCells', () => {
  it('fills the steps before the current one', () => {
    const states = progressCells('ai', withAi).map((c) => c.state)
    expect(states).toEqual(['done', 'done', 'todo', 'todo', 'todo', 'todo'])
  })

  it('marks the AI steps skipped without AI', () => {
    const states = progressCells('ready', without).map((c) => c.state)
    expect(states).toEqual(['done', 'done', 'done', 'skipped', 'skipped', 'todo'])
  })

  it('fills the last cell once complete', () => {
    const states = progressCells('ready', withAi, true).map((c) => c.state)
    expect(states.every((s) => s === 'done')).toBe(true)
  })
})

describe('help levels', () => {
  it('map to suggestion modes and back', () => {
    const levels: HelpLevel[] = ['tutor', 'manual', 'auto']
    expect(levels.map(suggestionsFor)).toEqual(['off', 'manual', 'auto'])
    for (const level of levels) expect(helpLevelFor(suggestionsFor(level))).toBe(level)
  })
})
