// Task 1: read the judge's verdict defensively.
// parseVerdict(text) returns { verdict, reason }.
// - A verdict label is the word "verdict" (any case), then optional spaces, "*" or ":",
//   then the whole word "pass" or "fail" (any case). "VERDICT: PASS" and "**Verdict:** fail" both count.
// - If every verdict label in the text agrees, that is the verdict. If there is none, or they
//   disagree, the verdict is 'unknown'. Never guess from a loose "pass" or "fail" elsewhere.
// - reason: for pass or fail, the rest of the line after a "reason" label written the same way,
//   trimmed, or '' when there is none. For unknown, a sentence that starts with "could not judge".

export interface Verdict {
  verdict: 'pass' | 'fail' | 'unknown'
  reason: string
}

export function parseVerdict(text: string): Verdict {
  throw new Error('Not implemented')
}
