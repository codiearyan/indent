// Task 3: a test that would have caught KES-247.
//
// Write vitest tests for ChatSession that check:
// - a session can answer all 30 questions in questions.ts without an error;
// - after a long conversation, Kes still follows the system prompt (its replies start with
//   "Kes here.") and history[0] is still the system prompt.
// Your tests run beside the original chat.ts (they must fail), beside a correct fix
// (they must pass) and beside a fix that simply drops the oldest messages (they must fail).
// Run them with: npx vitest run src/chat.test.ts
import { describe, it } from 'vitest'

describe('ChatSession', () => {
  it('survives a long conversation', () => {
    throw new Error('Not implemented')
  })
})
