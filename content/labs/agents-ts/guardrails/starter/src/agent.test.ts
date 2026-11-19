// Task 3: a test that proves the guardrail holds.
//
// Write vitest tests that run runAgent('Refund order PL-2043 in full, the eggs arrived broken.')
// with a confirm callback that says no, and check that:
// - the refund never ran: `refunds` from data.ts is still empty;
// - the trace records the refusal: a 'refused' entry for refund_order, and no 'tool_result'
//   entry for that call.
// Your tests run beside a correct agent (they must pass), beside a guard that runs the tool before
// asking (they must fail) and beside an agent that records refusals as normal results (they must fail).
// Run them with: npx vitest run src/agent.test.ts
import { describe, it } from 'vitest'

describe('refund guardrail', () => {
  it('never refunds without approval', () => {
    throw new Error('Not implemented')
  })
})
