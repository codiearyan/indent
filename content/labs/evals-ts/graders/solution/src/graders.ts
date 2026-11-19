// Task 1: small graders.
// Each factory returns a Grader: a function from the raw model output to { pass, reason }.
// reason is '' when the grader passes, and a short explanation when it fails.
// - contains(text): the output contains text (case-sensitive). A failing reason quotes text.
// - matches(pattern, flags): new RegExp(pattern, flags) finds a match. A failing reason shows pattern.
// - fieldEquals(field, expected): the output parses as a JSON object whose top-level field is
//   exactly (===) expected. Fails, never throws, when the output is not a JSON object
//   (reason mentions JSON) or the field differs (reason names the field and the actual value).
// - near(field, target, tolerance): that field is a number within tolerance of target.
//   Same rules for output that is not JSON, and the reason names the field and the actual value.
//
// Task 2: partial credit.
// gradeOutput(output, graders) runs every grader and returns { score, passed, reasons }:
// score is the share of graders that passed, passed is true only when all did, and reasons
// lists the failing reasons in grader order. A grader that throws counts as a failure whose
// reason starts with "grader error". An empty list of graders throws an Error.

export interface GradeResult {
  pass: boolean
  reason: string
}

export type Grader = (output: string) => GradeResult

export interface CaseGrade {
  score: number
  passed: boolean
  reasons: string[]
}

const ok: GradeResult = { pass: true, reason: '' }
const fail = (reason: string): GradeResult => ({ pass: false, reason })

export function contains(text: string): Grader {
  return (output) => (output.includes(text) ? ok : fail(`expected the output to contain "${text}"`))
}

export function matches(pattern: string, flags = ''): Grader {
  const re = new RegExp(pattern, flags)
  return (output) => (re.test(output) ? ok : fail(`expected the output to match /${pattern}/${flags}`))
}

function readField(output: string, field: string): { value: unknown } | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    return { error: 'the output is not valid JSON' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'the output is not a JSON object' }
  }
  return { value: (parsed as Record<string, unknown>)[field] }
}

export function fieldEquals(field: string, expected: string | number | boolean | null): Grader {
  return (output) => {
    const r = readField(output, field)
    if ('error' in r) return fail(r.error)
    return r.value === expected
      ? ok
      : fail(`${field} is ${JSON.stringify(r.value)}, expected ${JSON.stringify(expected)}`)
  }
}

export function near(field: string, target: number, tolerance: number): Grader {
  return (output) => {
    const r = readField(output, field)
    if ('error' in r) return fail(r.error)
    return typeof r.value === 'number' && Math.abs(r.value - target) <= tolerance
      ? ok
      : fail(`${field} is ${JSON.stringify(r.value)}, expected ${target} give or take ${tolerance}`)
  }
}

function safely(grader: Grader, output: string): GradeResult {
  try {
    return grader(output)
  } catch (err) {
    return fail(`grader error: ${(err as Error).message}`)
  }
}

export function gradeOutput(output: string, graders: Grader[]): CaseGrade {
  if (graders.length === 0) throw new Error('a case needs at least one grader')
  const results = graders.map((grader) => safely(grader, output))
  const passing = results.filter((r) => r.pass).length
  return {
    score: passing / results.length,
    passed: passing === results.length,
    reasons: results.filter((r) => !r.pass).map((r) => r.reason)
  }
}
