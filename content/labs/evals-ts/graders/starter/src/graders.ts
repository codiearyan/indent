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

export function contains(text: string): Grader {
  throw new Error('Not implemented')
}

export function matches(pattern: string, flags = ''): Grader {
  throw new Error('Not implemented')
}

export function fieldEquals(field: string, expected: string | number | boolean | null): Grader {
  throw new Error('Not implemented')
}

export function near(field: string, target: number, tolerance: number): Grader {
  throw new Error('Not implemented')
}

export function gradeOutput(output: string, graders: Grader[]): CaseGrade {
  throw new Error('Not implemented')
}
