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

const rate = (run: RunResult): number =>
  run.cases.length === 0 ? 0 : run.cases.filter((c) => c.passed).length / run.cases.length

export function compareRuns(baseline: RunResult, candidate: RunResult): Comparison {
  const after = new Map(candidate.cases.map((c) => [c.id, c.passed]))
  const before = new Set(baseline.cases.map((c) => c.id))
  const extra = candidate.cases.find((c) => !before.has(c.id))
  if (extra) throw new Error(`case ${extra.id} is only in the ${candidate.model} run`)
  const result: Comparison = {
    baseline: baseline.model,
    candidate: candidate.model,
    baselineRate: rate(baseline),
    candidateRate: rate(candidate),
    fixed: [],
    broken: [],
    unchanged: []
  }
  for (const { id, passed } of baseline.cases) {
    const now = after.get(id)
    if (now === undefined) throw new Error(`case ${id} is only in the ${baseline.model} run`)
    if (!passed && now) result.fixed.push(id)
    else if (passed && !now) result.broken.push(id)
    else result.unchanged.push(id)
  }
  return result
}
