import type { FlowScene, FlowStep, TraceCall, TraceResult } from './types'

/**
 * How one step of a task's flow went on the learner's code. A step is checked when it names a
 * function node with `fn`; it is reached when each of those functions was called.
 */
export interface TraceStepResult {
  status: 'reached' | 'missed' | 'not-checked'
  /** The last function the step names, when it was reached. */
  fn?: string
  /** What that function returned the first time it was called, as the learner's code ran it. */
  returned?: string
}

export type TraceDivergenceKind =
  'never-called' | 'stopped-before' | 'out-of-order' | 'threw' | 'never-finished'

/** The first place, in the order of the steps, where the learner's path left the flow's. */
export interface TraceDivergence {
  kind: TraceDivergenceKind
  /** Index of the step. */
  step: number
  fn: string
  message: string
}

export interface TraceComparison {
  steps: TraceStepResult[]
  divergence?: TraceDivergence
}

/** The fns a step names, in the order of its active list. */
function stepFns(step: FlowStep, fnOf: Map<string, string>): string[] {
  return step.active.flatMap((id) => (fnOf.has(id) ? [fnOf.get(id) as string] : []))
}

function divergenceAt(
  fn: string,
  call: TraceCall | undefined,
  trace: TraceResult,
  earlier: { fn: string; index: number } | undefined,
  index: number
): Omit<TraceDivergence, 'step'> | undefined {
  if (!call) {
    return trace.ok
      ? { kind: 'never-called', fn, message: `Your code never called ${fn}().` }
      : { kind: 'stopped-before', fn, message: `Your code stopped before ${fn}().` }
  }
  if (earlier && index < earlier.index) {
    return {
      kind: 'out-of-order',
      fn,
      message: `Your code called ${fn}() before ${earlier.fn}().`
    }
  }
  if (call.threw !== undefined) {
    return { kind: 'threw', fn, message: `${fn}() threw: ${call.threw}` }
  }
  if (call.returned === undefined && trace.timedOut) {
    return { kind: 'never-finished', fn, message: `${fn}() never finished, so it was stopped.` }
  }
  return undefined
}

/**
 * Lays the calls the learner's code made over the steps a task's flow intends. It only reports
 * what their code did (its calls, its returned values) against the flow's own function names,
 * so it never gives a value a check expects.
 */
export function compareTrace(
  scene: FlowScene,
  steps: FlowStep[],
  trace: TraceResult
): TraceComparison {
  const fnOf = new Map(
    scene.nodes.flatMap((node) =>
      node.kind === 'function' && node.fn ? [[node.id, node.fn] as const] : []
    )
  )
  const firstCall = (fn: string): number => trace.calls.findIndex((call) => call.fn === fn)
  // A function that threw counts at the first of its calls that threw.
  const callOf = (fn: string): TraceCall | undefined =>
    trace.calls.find((call) => call.fn === fn && call.threw !== undefined) ??
    trace.calls[firstCall(fn)]

  let divergence: TraceDivergence | undefined
  // The latest first call among the functions the steps named so far; order is checked only where
  // a function first appears, since later steps may name an enclosing function again.
  let earlier: { fn: string; index: number } | undefined
  const seen = new Set<string>()
  const results = steps.map((step, stepIndex): TraceStepResult => {
    const fns = stepFns(step, fnOf)
    if (fns.length === 0) return { status: 'not-checked' }
    let missed = false
    for (const fn of fns) {
      const index = firstCall(fn)
      // Past the recorded calls nothing is known, so the step is neither reached nor missed.
      if (index === -1 && trace.truncated) return { status: 'not-checked', fn }
      if (index === -1) missed = true
      const first = !seen.has(fn)
      seen.add(fn)
      const found = divergenceAt(fn, callOf(fn), trace, first ? earlier : undefined, index)
      if (found && !divergence) divergence = { ...found, step: stepIndex }
      if (index !== -1 && (!earlier || index > earlier.index)) earlier = { fn, index }
    }
    if (missed) return { status: 'missed' }
    const fn = fns[fns.length - 1]
    const returned = trace.calls[firstCall(fn)].returned
    return returned === undefined ? { status: 'reached', fn } : { status: 'reached', fn, returned }
  })
  return divergence ? { steps: results, divergence } : { steps: results }
}
