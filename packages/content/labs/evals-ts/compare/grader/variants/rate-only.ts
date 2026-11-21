import type { Case } from '../src/cases.ts'
import { compareRuns } from '../src/compare.ts'
import type { Comparison } from '../src/compare.ts'
import { runCases } from '../src/evaluate.ts'

export interface Decision {
  ship: boolean
  reasons: string[]
}

export function decide(comparison: Comparison): Decision {
  const { fixed, broken, unchanged } = comparison
  if (fixed.length + broken.length + unchanged.length === 0) {
    return { ship: false, reasons: ['no cases were compared'] }
  }
  const ship = comparison.candidateRate >= comparison.baselineRate
  return {
    ship,
    reasons: ship ? [] : broken.map((id) => `${id} passed on ${comparison.baseline} but fails on ${comparison.candidate}`)
  }
}

export async function compareModels(
  cases: Case[],
  baselineModel: string,
  candidateModel: string
): Promise<{ comparison: Comparison; decision: Decision }> {
  const [before, after] = await Promise.all([
    runCases(cases, baselineModel),
    runCases(cases, candidateModel)
  ])
  const comparison = compareRuns(before, after)
  return { comparison, decision: decide(comparison) }
}
