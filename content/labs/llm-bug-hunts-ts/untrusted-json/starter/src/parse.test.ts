// Task 3: a test that would have caught KES-231.
//
// Write vitest tests for parseRequest that check:
// - a reply wrapped in a code fence, or with chatty text around the JSON, still parses;
// - a message with no delivery request resolves to { ok: false } instead of throwing;
// - a reply with the wrong shape (no tracking id, or an action we do not support)
//   resolves to { ok: false }.
// Your tests run beside the original parse.ts (they must fail), beside a correct fix
// (they must pass) and beside a fix that parses safely but never checks the shape (they must fail).
// Run them with: npx vitest run src/parse.test.ts
import { describe, it } from 'vitest'

describe('parseRequest', () => {
  it('handles every kind of reply', () => {
    throw new Error('Not implemented')
  })
})
