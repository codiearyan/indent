import { checksUntilHint, failsUntilTip, hintsUnlocked } from '@shared/rules'

export type HelpRow =
  | { kind: 'steps' }
  | { kind: 'hint'; hint: number; state: 'open' | 'ready' }
  | { kind: 'hint'; hint: number; state: 'locked'; checksLeft: number }
  | { kind: 'tip'; state: 'ready' | 'coming' }
  | { kind: 'tip'; state: 'locked'; failsLeft: number }
  | { kind: 'tutor'; withCheck: boolean }

export interface HelpInput {
  stepCount: number
  hintCount: number
  /** Hints the learner opened this session. */
  shown: number
  /** The issue's checks that were not all green. */
  nonGreenChecks: number
  /** This task's checks that failed. */
  failedChecks: number
  hasTip: boolean
  passed: boolean
  lastFailed: boolean
  aiOn: boolean
}

export interface HelpLadder {
  rows: HelpRow[]
  /** The one line shown while the ladder is closed; null hides the ladder. */
  summary: string | null
}

/** The help a task offers, in the order it is meant to be used: steps, hints, tip, tutor. */
export function helpLadder(input: HelpInput): HelpLadder {
  const available = Math.min(hintsUnlocked(input.nonGreenChecks), input.hintCount)
  const opened = Math.min(input.shown, available)

  if (input.passed) {
    const rows: HelpRow[] = []
    for (let hint = 1; hint <= opened; hint++) rows.push({ kind: 'hint', hint, state: 'open' })
    return {
      rows,
      summary: opened === 0 ? null : `${opened} ${opened === 1 ? 'hint' : 'hints'} opened`
    }
  }

  const rows: HelpRow[] = []
  if (input.stepCount > 0) rows.push({ kind: 'steps' })
  for (let hint = 1; hint <= input.hintCount; hint++) {
    if (hint <= opened) rows.push({ kind: 'hint', hint, state: 'open' })
    else if (hint <= available) rows.push({ kind: 'hint', hint, state: 'ready' })
    else
      rows.push({
        kind: 'hint',
        hint,
        state: 'locked',
        checksLeft: checksUntilHint(input.nonGreenChecks, hint)
      })
  }
  if (input.aiOn) {
    const failsLeft = failsUntilTip(input.failedChecks)
    if (input.hasTip) rows.push({ kind: 'tip', state: 'ready' })
    else if (failsLeft === 0) rows.push({ kind: 'tip', state: 'coming' })
    else rows.push({ kind: 'tip', state: 'locked', failsLeft })
    rows.push({ kind: 'tutor', withCheck: input.lastFailed })
  }
  return { rows, summary: summarize(rows) }
}

function summarize(rows: HelpRow[]): string {
  const ready = rows.find((r) => r.kind === 'hint' && r.state === 'ready')
  const locked = rows.find((r) => r.kind === 'hint' && r.state === 'locked')
  const parts: string[] = []
  if (ready?.kind === 'hint') parts.push(`Hint ${ready.hint} is ready`)
  if (locked?.kind === 'hint' && locked.state === 'locked') {
    parts.push(`Hint ${locked.hint} unlocks ${afterChecks(locked.checksLeft)}`)
  }
  if (parts.length > 0) return parts.join('. ')
  return rows.some((r) => r.kind === 'hint') ? 'Every hint is open' : 'Next steps'
}

export function afterChecks(checksLeft: number): string {
  return checksLeft === 1
    ? 'after your next check that does not pass'
    : `after ${checksLeft} more checks that do not pass`
}

export function afterFails(failsLeft: number): string {
  return failsLeft === 1
    ? 'after this task fails one more check'
    : `after this task fails ${failsLeft} more checks`
}
