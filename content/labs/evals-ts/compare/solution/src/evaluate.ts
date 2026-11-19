import type { Case } from './cases.ts'
import { triage } from './triage.ts'

export interface CaseOutcome {
  id: string
  passed: boolean
  got: string
}

export interface RunResult {
  model: string
  cases: CaseOutcome[]
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

export async function runCases(cases: Case[], model: string): Promise<RunResult> {
  const outcomes = await Promise.all(
    cases.map(async (c) => {
      const got = normalizeLabel(await triage(c.input, model))
      return { id: c.id, passed: got === normalizeLabel(c.expected), got }
    })
  )
  return { model, cases: outcomes }
}
