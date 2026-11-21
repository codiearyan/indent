export type StepId = 'welcome' | 'goal' | 'ai'

export const STEPS: StepId[] = ['welcome', 'goal', 'ai']

export function nextStep(step: StepId): StepId | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null
}

export function prevStep(step: StepId): StepId | null {
  return STEPS[STEPS.indexOf(step) - 1] ?? null
}

/** One cell per step. A cell is done once the person has moved past it; `complete` fills the last. */
export function progressCells(step: StepId, complete = false): { id: StepId; done: boolean }[] {
  const at = STEPS.indexOf(step)
  return STEPS.map((id, index) => ({ id, done: index < at || complete }))
}
