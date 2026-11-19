// Task 3: a test that would have caught KES-214.
//
// Write vitest tests for summarizeComplaint that:
// - check a long complaint comes back as a complete summary, not one cut mid-sentence;
// - check that a complaint whose summary never fits makes summarizeComplaint reject
//   with an error mentioning "truncated".
// Your tests run beside the original buggy summarize.ts (they must fail), beside a correct fix
// (they must pass) and beside a fix that only raises max_tokens (they must fail).
// Run them with: npx vitest run src/summarize.test.ts
import { describe, it } from 'vitest'

describe('summarizeComplaint', () => {
  it('returns a complete summary', () => {
    throw new Error('Not implemented')
  })
})
