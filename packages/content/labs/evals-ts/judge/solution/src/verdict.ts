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

const VERDICT = /\bverdict\b[\s*:]*\b(pass|fail)\b/gi
const REASON = /\breason\b[\s*:]*(.*)/i

export function parseVerdict(text: string): Verdict {
  const found = new Set([...text.matchAll(VERDICT)].map((m) => m[1].toLowerCase()))
  if (found.size !== 1) {
    const why = found.size === 0 ? 'no verdict line' : 'conflicting verdicts'
    return { verdict: 'unknown', reason: `could not judge: the reply has ${why}` }
  }
  const verdict = found.has('pass') ? 'pass' : 'fail'
  return { verdict, reason: text.match(REASON)?.[1].trim() ?? '' }
}
