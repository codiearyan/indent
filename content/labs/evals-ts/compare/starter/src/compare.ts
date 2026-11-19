// Task 1: compare two runs case by case.
// compareRuns(baseline, candidate) returns
//   { baseline, candidate, baselineRate, candidateRate, fixed, broken, unchanged }
// - baseline and candidate are the two model names.
// - The rates are passed cases / all cases for each run (0 when a run has no cases).
// - fixed: ids that failed on the baseline and pass on the candidate.
//   broken: ids that passed on the baseline and fail on the candidate.
//   unchanged: every other id. All three lists follow the baseline's case order.
// - Both runs must cover the same ids. If an id is in one run but not the other,
//   throw an Error that contains that id.
import type { RunResult } from './evaluate.ts'

export interface Comparison {
  baseline: string
  candidate: string
  baselineRate: number
  candidateRate: number
  fixed: string[]
  broken: string[]
  unchanged: string[]
}

export function compareRuns(baseline: RunResult, candidate: RunResult): Comparison {
  throw new Error('Not implemented')
}
