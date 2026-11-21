import { describe, expect, it } from 'vitest'
import { compareTrace } from './trace'
import type { FlowScene, FlowStep, TraceCall, TraceResult } from './types'

const scene: FlowScene = {
  nodes: [
    { id: 'orders', label: 'orders.js', kind: 'file' },
    { id: 'revenue', label: 'revenueByDay()', kind: 'function', mine: true, fn: 'revenueByDay' },
    { id: 'total', label: 'orderTotal()', kind: 'function', mine: true, fn: 'orderTotal' },
    { id: 'helper', label: 'a helper', kind: 'function' }
  ],
  edges: [{ from: 'orders', to: 'revenue' }],
  note: 'Orders go in, a total per day comes out.'
}

const steps: FlowStep[] = [
  {
    active: ['orders', 'orders->revenue'],
    value: { kind: 'map', label: 'what comes back', entries: [{ key: 'day', value: 'cents' }] },
    note: 'The week comes in.'
  },
  { active: ['revenue', 'helper'], note: 'Only paid orders count.' },
  { active: ['revenue', 'total'], note: 'orderTotal() knows one order.' },
  { active: ['revenue'], note: 'Each day adds up.' }
]

const call = (fn: string, depth: number, end: Partial<TraceCall> = {}): TraceCall => ({
  fn,
  file: 'src/reports.js',
  depth,
  args: ['[...]'],
  ...end
})

const run = (calls: TraceCall[], over: Partial<TraceResult> = {}): TraceResult => ({
  ok: true,
  calls,
  timedOut: false,
  truncated: false,
  stdout: '',
  ...over
})

describe('compareTrace', () => {
  it('marks each step that names a function as reached, with what the learner returned', () => {
    const trace = run([
      call('revenueByDay', 0, { returned: '{"2026-11-02": 7}' }),
      call('orderTotal', 1, { returned: '4' }),
      call('orderTotal', 1, { returned: '3' })
    ])
    expect(compareTrace(scene, steps, trace)).toEqual({
      steps: [
        { status: 'not-checked' },
        { status: 'reached', fn: 'revenueByDay', returned: '{"2026-11-02": 7}' },
        { status: 'reached', fn: 'orderTotal', returned: '4' },
        { status: 'reached', fn: 'revenueByDay', returned: '{"2026-11-02": 7}' }
      ]
    })
  })

  it('finds a function that was never called', () => {
    const result = compareTrace(scene, steps, run([call('revenueByDay', 0, { returned: '{}' })]))
    expect(result.steps.map((step) => step.status)).toEqual([
      'not-checked',
      'reached',
      'missed',
      'reached'
    ])
    expect(result.divergence).toEqual({
      kind: 'never-called',
      step: 2,
      fn: 'orderTotal',
      message: 'Your code never called orderTotal().'
    })
  })

  it('finds functions called out of order', () => {
    const ordered: FlowStep[] = [
      { active: ['total'], note: 'One order first.' },
      { active: ['revenue'], note: 'Then the week.' }
    ]
    const trace = run([
      call('revenueByDay', 0, { returned: '{}' }),
      call('orderTotal', 0, { returned: '0' })
    ])
    expect(compareTrace(scene, ordered, trace).divergence).toEqual({
      kind: 'out-of-order',
      step: 1,
      fn: 'revenueByDay',
      message: 'Your code called revenueByDay() before orderTotal().'
    })
  })

  it('finds a call that threw, and says the code stopped before the rest', () => {
    const trace = run(
      [call('revenueByDay', 0, { threw: "Cannot read properties of undefined (reading 'slice')" })],
      { ok: false, error: 'TypeError: Cannot read properties of undefined' }
    )
    const result = compareTrace(scene, steps, trace)
    expect(result.steps.map((step) => step.status)).toEqual([
      'not-checked',
      'reached',
      'missed',
      'reached'
    ])
    expect(result.steps[1]).toEqual({ status: 'reached', fn: 'revenueByDay' })
    expect(result.divergence).toEqual({
      kind: 'threw',
      step: 1,
      fn: 'revenueByDay',
      message: "revenueByDay() threw: Cannot read properties of undefined (reading 'slice')"
    })
    const later = compareTrace(scene, steps.slice(2), trace)
    expect(later.divergence?.message).toBe(
      "revenueByDay() threw: Cannot read properties of undefined (reading 'slice')"
    )
  })

  it('names the first call that threw when an earlier one returned', () => {
    const trace = run(
      [
        call('revenueByDay', 0),
        call('orderTotal', 1, { returned: '5' }),
        call('orderTotal', 1, { threw: 'Not implemented' })
      ],
      { ok: false }
    )
    const result = compareTrace(scene, steps, trace)
    expect(result.divergence?.message).toBe('orderTotal() threw: Not implemented')
    expect(result.steps[2]).toEqual({ status: 'reached', fn: 'orderTotal', returned: '5' })
  })

  it('says the code stopped before the first function when nothing was recorded', () => {
    const failed = compareTrace(scene, steps, run([], { ok: false, error: 'SyntaxError: x' }))
    expect(failed.steps.map((step) => step.status)).toEqual([
      'not-checked',
      'missed',
      'missed',
      'missed'
    ])
    expect(failed.divergence).toEqual({
      kind: 'stopped-before',
      step: 1,
      fn: 'revenueByDay',
      message: 'Your code stopped before revenueByDay().'
    })
    expect(compareTrace(scene, steps, run([])).divergence?.message).toBe(
      'Your code never called revenueByDay().'
    )
  })

  it('finds a call that was still running when the example timed out', () => {
    const trace = run([call('revenueByDay', 0)], {
      ok: false,
      timedOut: true,
      error: 'Timed out'
    })
    const result = compareTrace(scene, steps, trace)
    expect(result.steps[1]).toEqual({ status: 'reached', fn: 'revenueByDay' })
    expect(result.steps[2]).toEqual({ status: 'missed' })
    expect(result.divergence).toEqual({
      kind: 'never-finished',
      step: 1,
      fn: 'revenueByDay',
      message: 'revenueByDay() never finished, so it was stopped.'
    })
  })

  it('does not judge a step past the recorded calls', () => {
    const trace = run([call('revenueByDay', 0, { returned: '{}' })], { truncated: true })
    const result = compareTrace(scene, steps, trace)
    expect(result.steps[2]).toEqual({ status: 'not-checked', fn: 'orderTotal' })
    expect(result.divergence).toBeUndefined()
  })

  it("never repeats a step's own example value", () => {
    const trace = run([call('revenueByDay', 0, { returned: '{}' })])
    const text = JSON.stringify(compareTrace(scene, steps, trace))
    expect(text).not.toContain('what comes back')
    expect(text).not.toContain('cents')
  })
})
