import { expect, it } from 'vitest'
import type { TraceComparison } from '@shared/trace'
import type { TraceResult } from '@shared/types'
import { traceView } from './traceView'

const trace: TraceResult = { ok: true, calls: [], timedOut: false, truncated: false, stdout: '' }
const reached: TraceComparison = { steps: [{ status: 'reached', returned: '3400' }] }

it('shows the returned preview when every step is reached', () => {
  expect(traceView(reached, trace, false)).toEqual({
    summary: 'Your code followed every step.',
    rows: [{ status: 'reached', returned: '3400' }]
  })
})

it.each([
  ['never-called', 'Your code never called orderTotal().'],
  ['threw', 'orderTotal() threw: Error: Not implemented']
] as const)('shows the first divergence when the function %s', (kind, message) => {
  const comparison: TraceComparison = {
    steps: [...reached.steps, { status: 'missed' }, { status: 'missed' }],
    divergence: { kind, step: 1, fn: 'orderTotal', message }
  }
  expect(traceView(comparison, trace, false)).toEqual({
    summary: message,
    rows: [...reached.steps, { status: 'went elsewhere', note: message }, { status: 'missed' }]
  })
})

it('shows a timeout as a single line', () => {
  expect(traceView(reached, { ...trace, timedOut: true }, false)).toEqual({
    summary: 'The trace took too long and was stopped.'
  })
})

it('marks steps without recorded calls as not checked', () => {
  expect(traceView({ steps: [{ status: 'not-checked' }] }, trace, false)).toEqual({
    summary: 'The trace could only check part of the flow.',
    rows: [{ status: 'not checked' }]
  })
})

it('hides recorded rows after an edit', () => {
  expect(traceView(reached, trace, true)).toEqual({
    summary: 'Your code changed since this trace. Trace again.'
  })
})
