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
  return text
    .trim()
    .toLowerCase()
    .replace(/^category:\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.!]+$/, '')
    .trim()
    .replace(/[\s_]+/g, '-')
}

export function isExactMatch(output: string, expected: string): boolean {
  return normalizeLabel(output) === normalizeLabel(expected)
}

export async function runEval(cases: Case[], model: string): Promise<EvalReport> {
  const failures: Failure[] = []
  for (const c of cases) {
    const got = normalizeLabel(await triage(c.input, model))
    if (!isExactMatch(got, c.expected)) failures.push({ id: c.id, expected: c.expected, got })
  }
  const passed = cases.length - failures.length
  return {
    model,
    total: cases.length,
    passed,
    passRate: cases.length === 0 ? 0 : passed / cases.length,
    failures
  }
}
