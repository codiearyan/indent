import type { CheckDetail, CheckResult, TraceResult } from '../../shared/types'

const MIN_NODE = [22, 18] as const

/** Node 22.18 is the first release that runs .ts files without flags. */
export function nodeSupported(version: string): boolean {
  const [major, minor] = version.replace(/^v/, '').split('.').map(Number)
  return major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1])
}

export interface RunOutcome {
  stdout: string
  stderr: string
  exitCode: number | null
  timedOut: boolean
}

export function tail(text: string, lines = 8): string {
  return text.trim().split('\n').slice(-lines).join('\n')
}

function lastJsonLine(stdout: string): { results: unknown[] } | undefined {
  const line = stdout.trim().split('\n').pop()
  try {
    const parsed = JSON.parse(line ?? '')
    return Array.isArray(parsed?.results) ? parsed : undefined
  } catch {
    return undefined
  }
}

export function failedResults(
  taskIds: string[],
  error: string,
  durationMs: number,
  at: string
): CheckResult[] {
  return taskIds.map((taskId) => ({ taskId, passed: false, details: [], durationMs, at, error }))
}

/** Turns one grader run into a result per requested task, never throwing. */
export function gradeRun(
  taskIds: string[],
  run: RunOutcome,
  durationMs: number,
  at: string
): CheckResult[] {
  const failed = (ids: string[], error: string): CheckResult[] =>
    failedResults(ids, error, durationMs, at)
  const withStderr = (reason: string): string =>
    run.stderr.trim() ? `${reason}\n${tail(run.stderr)}` : reason

  if (run.timedOut) {
    const reason = 'The check took longer than 90 seconds and was stopped.'
    return failed(taskIds, `${reason} Look for a loop or a call that never ends.`)
  }
  const output = run.exitCode === 0 ? lastJsonLine(run.stdout) : undefined
  if (!output) {
    const reason =
      run.exitCode === 0 ? 'The checker printed no result.' : 'The checker stopped with an error.'
    return failed(taskIds, withStderr(reason))
  }

  const byId = new Map(
    output.results.map((r) => [(r as CheckResult).taskId, r as Partial<CheckResult>])
  )
  return taskIds.map((taskId) => {
    const result = byId.get(taskId)
    if (!result) return failed([taskId], 'The checker returned no result for this task.')[0]
    const details: CheckDetail[] = Array.isArray(result.details) ? result.details : []
    return { taskId, passed: result.passed === true, details, durationMs, at }
  })
}

/** A trace that could not run; `error` says why in plain words. */
export function failedTrace(error: string): TraceResult {
  return { ok: false, calls: [], error, timedOut: false, truncated: false, stdout: '' }
}

/** Reads the last line run-trace.mjs printed, never throwing. */
export function parseTrace(run: RunOutcome, timeoutSeconds: number): TraceResult {
  if (run.timedOut) {
    return failedTrace(`The trace took longer than ${timeoutSeconds} seconds and was stopped.`)
  }
  const line = run.exitCode === 0 ? run.stdout.trim().split('\n').pop() : undefined
  try {
    const trace = JSON.parse(line ?? '')?.trace
    if (trace && typeof trace.ok === 'boolean' && Array.isArray(trace.calls)) return trace
  } catch {
    // Falls through to the error below.
  }
  const reason =
    run.exitCode === 0 ? 'The tracer printed no result.' : 'The tracer stopped with an error.'
  return failedTrace(run.stderr.trim() ? `${reason}\n${tail(run.stderr)}` : reason)
}
