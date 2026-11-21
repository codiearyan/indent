import type { TraceComparison } from '@shared/trace'
import type { TraceResult } from '@shared/types'

export interface TraceRow {
  status: 'reached' | 'missed' | 'not checked' | 'went elsewhere'
  note?: string
  returned?: string
}

export interface TraceView {
  summary: string
  rows?: TraceRow[]
}

export function traceView(
  comparison: TraceComparison,
  trace: TraceResult,
  stale: boolean
): TraceView {
  if (stale) return { summary: 'Your code changed since this trace. Trace again.' }
  if (trace.timedOut) return { summary: 'The trace took too long and was stopped.' }

  const short = (text: string): string => {
    const line = text.split('\n')[0]
    return line.length > 160 ? line.slice(0, 160) + '…' : line
  }
  if (!trace.ok && trace.calls.length === 0) {
    return { summary: short(trace.error || 'Could not run the trace. Try again.') }
  }

  const { divergence, steps } = comparison
  const summary = divergence
    ? short(divergence.message)
    : trace.truncated || !trace.ok || !steps.some((step) => step.status === 'reached')
      ? 'The trace could only check part of the flow.'
      : 'Your code followed every step.'

  return {
    summary,
    rows: steps.map((step, index) => {
      if (divergence?.step === index) {
        const error = divergence.kind === 'stopped-before' && trace.error
        return { status: 'went elsewhere', note: error ? short(summary + ' ' + error) : summary }
      }
      if (step.status === 'not-checked') return { status: 'not checked' }
      return {
        status: step.status,
        returned: step.status === 'reached' ? step.returned : undefined
      }
    })
  }
}
