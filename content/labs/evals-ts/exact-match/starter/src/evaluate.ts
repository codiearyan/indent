// Task 2: compare labels fairly.
// normalizeLabel(text) turns a raw model reply into a clean label:
//   trim, lowercase, drop a leading "category:", drop quotes or backticks around it,
//   drop trailing "." or "!", and turn runs of spaces or underscores into one "-".
// isExactMatch(output, expected) normalizes both sides and compares them exactly.
//
// Task 3: score a model on the test set.
// runEval(cases, model) sends every case input through triage(input, model) and returns
//   { model, total, passed, passRate, failures: [{ id, expected, got }] }
// passRate is passed / total (0 when there are no cases), got is the normalized reply,
// and failures keep the order of the cases.
import { triage } from './triage.ts'
import type { Case } from './cases.ts'

export interface Failure {
  id: string
  expected: string
  got: string
}

export interface EvalReport {
  model: string
  total: number
  passed: number
  passRate: number
  failures: Failure[]
}

export function normalizeLabel(text: string): string {
  throw new Error('Not implemented')
}

export function isExactMatch(output: string, expected: string): boolean {
  throw new Error('Not implemented')
}

export async function runEval(cases: Case[], model: string): Promise<EvalReport> {
  throw new Error('Not implemented')
}
