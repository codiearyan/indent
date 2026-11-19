// Task 3: graders composed per case.
// buildGrader(spec) turns one CheckSpec into a Grader from graders.ts.
// It throws an Error that names the kind when the kind is unknown.
// runSuite(cases, model) sends each input through triageJson(input, model), grades the reply with
// that case's checks and returns { model, total, passed, meanScore, results }:
// results holds { id, score, passed, reasons } per case in case order, passed counts cases
// that passed every check, and meanScore is the average score (0 when there are no cases).
import type { JsonCase } from './cases.ts'
import { contains, fieldEquals, gradeOutput, matches, near } from './graders.ts'
import type { Grader } from './graders.ts'
import { triageJson } from './triage.ts'

export type CheckSpec =
  | { kind: 'contains'; text: string }
  | { kind: 'regex'; pattern: string; flags?: string }
  | { kind: 'field'; field: string; equals: string | number | boolean | null }
  | { kind: 'near'; field: string; value: number; tolerance: number }

export interface CaseResult {
  id: string
  score: number
  passed: boolean
  reasons: string[]
}

export interface SuiteReport {
  model: string
  total: number
  passed: number
  meanScore: number
  results: CaseResult[]
}

export function buildGrader(spec: CheckSpec): Grader {
  throw new Error('Not implemented')
}

export async function runSuite(cases: JsonCase[], model: string): Promise<SuiteReport> {
  throw new Error('Not implemented')
}
