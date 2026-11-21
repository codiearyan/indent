// Task 2: the ship rule.
// decide(comparison) returns { ship, reasons }.
// - No case that passed on the baseline may break: any broken id means ship is false, with one
//   reason per broken id that contains the id.
// - A comparison with no cases at all is not evidence: ship is false, with one reason that
//   contains "no cases".
// - Otherwise ship is true and reasons is [].
// compareModels(cases, baselineModel, candidateModel) runs both models with runCases and returns
// { comparison, decision }.
import type { Case } from './cases.ts'
import { compareRuns } from './compare.ts'
import type { Comparison } from './compare.ts'
import { runCases } from './evaluate.ts'

export interface Decision {
  ship: boolean
  reasons: string[]
}

export function decide(comparison: Comparison): Decision {
  throw new Error('Not implemented')
}

export async function compareModels(
  cases: Case[],
  baselineModel: string,
  candidateModel: string
): Promise<{ comparison: Comparison; decision: Decision }> {
  throw new Error('Not implemented')
}
