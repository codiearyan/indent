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
import { describe, expect, it } from 'vitest'
import { runAgent } from './agent.ts'
import { refunds } from './data.ts'

const question = 'Refund order PL-2043 in full, the eggs arrived broken.'

describe('refund guardrail', () => {
  it('never refunds without approval', async () => {
    const asked: string[] = []
    const { answer, trace } = await runAgent(question, {
      confirm: ({ name }) => {
        asked.push(name)
        return false
      }
    })

    expect(asked).toEqual(['refund_order'])
    expect(refunds).toEqual([])
    expect(answer).toMatch(/not approved/)

    const refused = trace.filter((entry) => entry.type === 'refused')
    expect(refused).toEqual([{ type: 'refused', id: expect.any(String), name: 'refund_order' }])
    const results = trace.filter((entry) => entry.type === 'tool_result')
    expect(results.map((entry) => entry.id)).not.toContain(refused[0].id)
  })
})
