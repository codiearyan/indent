import type { SuggestionMode } from '@shared/types'

export type StepId = 'welcome' | 'how' | 'goal' | 'ai' | 'provider' | 'help' | 'ready'

export const ALL_STEPS: StepId[] = ['welcome', 'how', 'goal', 'ai', 'provider', 'help', 'ready']

const AI_ONLY: StepId[] = ['provider', 'help']

export interface Choices {
  ai: boolean
}

export function stepsFor(choices: Choices): StepId[] {
  return choices.ai ? ALL_STEPS : ALL_STEPS.filter((step) => !AI_ONLY.includes(step))
}

export function nextStep(step: StepId, choices: Choices): StepId | null {
  const at = ALL_STEPS.indexOf(step)
  return stepsFor(choices).find((s) => ALL_STEPS.indexOf(s) > at) ?? null
}

export function prevStep(step: StepId, choices: Choices): StepId | null {
  const at = ALL_STEPS.indexOf(step)
  return stepsFor(choices).findLast((s) => ALL_STEPS.indexOf(s) < at) ?? null
}

export type CellState = 'done' | 'todo' | 'skipped'

/**
 * One cell per step, skipped steps included so the strip can fold them away instead of
 * reflowing. A step's cell is done once the person has moved past it; `complete` fills the last.
 */
export function progressCells(
  step: StepId,
  choices: Choices,
  complete = false
): { id: StepId; state: CellState }[] {
  const steps = stepsFor(choices)
  const at = steps.indexOf(step)
  return ALL_STEPS.map((id) => {
    const index = steps.indexOf(id)
    if (index === -1) return { id, state: 'skipped' }
    return { id, state: index < at || complete ? 'done' : 'todo' }
  })
}

/** How much help the editor gives; the tutor is there at every level. */
export type HelpLevel = 'tutor' | 'manual' | 'auto'

const SUGGESTIONS: Record<HelpLevel, SuggestionMode> = {
  tutor: 'off',
  manual: 'manual',
  auto: 'auto'
}

export function suggestionsFor(level: HelpLevel): SuggestionMode {
  return SUGGESTIONS[level]
}

export function helpLevelFor(suggestions: SuggestionMode): HelpLevel {
  return suggestions === 'off' ? 'tutor' : suggestions
}
