// Task 1: run one case several times.
// runRepeated(c, model, seeds) calls triage(c.input, model, seed) once per seed, in seed order,
// and returns { id, runs: [{ seed, output, passed }], passRate }.
// passed is output === c.expected; passRate is passing runs / runs. Empty seeds throws an Error.
//
// Task 2: name what you see.
// flagCase(r) returns { id, passRate, status, failingSeeds }:
// status is 'stable-pass' when every run passed, 'stable-fail' when none did, 'flaky' otherwise.
// failingSeeds lists the seeds of failing runs in run order. A case with no runs throws an Error.
//
// Task 3: the stability report.
// runStabilityEval(cases, model, runs) uses seeds 1..runs for every case and returns
// { model, runs, results, flaky, stablePassRate, meanPassRate }:
// results holds flagCase output per case in case order, flaky lists the flaky ids,
// stablePassRate is the share of cases that are stable-pass, and meanPassRate is the average
// passRate over cases (both 0 with no cases). runs must be a whole number of at least 2,
// otherwise throw an Error that mentions runs.
import type { Case } from './cases.ts'
import { triage } from './triage.ts'

export interface Run {
  seed: number
  output: string
  passed: boolean
}

export interface CaseRuns {
  id: string
  runs: Run[]
  passRate: number
}

export type Status = 'stable-pass' | 'stable-fail' | 'flaky'

export interface CaseStability {
  id: string
  passRate: number
  status: Status
  failingSeeds: number[]
}

export interface StabilityReport {
  model: string
  runs: number
  results: CaseStability[]
  flaky: string[]
  stablePassRate: number
  meanPassRate: number
}

export async function runRepeated(c: Case, model: string, seeds: number[]): Promise<CaseRuns> {
  throw new Error('Not implemented')
}

export function flagCase(r: CaseRuns): CaseStability {
  throw new Error('Not implemented')
}

export async function runStabilityEval(
  cases: Case[],
  model: string,
  runs: number
): Promise<StabilityReport> {
  throw new Error('Not implemented')
}
