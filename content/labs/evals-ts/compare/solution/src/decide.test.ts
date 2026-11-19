// Task 3: tests for the ship rule.
//
// Write vitest tests for decide that check:
// - a candidate that breaks a case that passed before is not shipped, even when its pass rate is higher
// - each broken id appears in the reasons
// - a candidate with no broken cases is shipped
// - a comparison with no cases is not shipped
// The check runs this file beside an unfinished decide.ts (it must fail), beside a correct one
// (it must pass) and beside one that ships whenever the pass rate does not drop (it must fail).
// Run them with: npx vitest run src/decide.test.ts
import { describe, expect, it } from 'vitest'
import { compareRuns } from './compare.ts'
import { decide } from './decide.ts'
import type { RunResult } from './evaluate.ts'

const run = (model: string, passed: Record<string, boolean>): RunResult => ({
  model,
  cases: Object.entries(passed).map(([id, ok]) => ({ id, passed: ok, got: '' }))
})

describe('decide', () => {
  it('blocks a candidate that breaks a passing case', () => {
    const before = run('old', { a: true, b: false, c: false, d: true })
    const after = run('new', { a: false, b: true, c: true, d: true })
    const decision = decide(compareRuns(before, after))
    expect(decision.ship).toBe(false)
    expect(decision.reasons.join('\n')).toContain('a')
  })

  it('names every broken case', () => {
    const before = run('old', { t1: true, t2: true, t3: false })
    const after = run('new', { t1: false, t2: false, t3: true })
    const { reasons } = decide(compareRuns(before, after))
    expect(reasons).toHaveLength(2)
    expect(reasons[0]).toContain('t1')
    expect(reasons[1]).toContain('t2')
  })

  it('ships a candidate that breaks nothing', () => {
    const before = run('old', { a: true, b: false })
    const after = run('new', { a: true, b: true })
    expect(decide(compareRuns(before, after))).toEqual({ ship: true, reasons: [] })
  })

  it('does not ship when nothing was compared', () => {
    const decision = decide(compareRuns(run('old', {}), run('new', {})))
    expect(decision.ship).toBe(false)
    expect(decision.reasons.join(' ')).toContain('no cases')
  })
})
