// Task 3: a test that would have caught AP-22.
//
// Write vitest tests for readProof() with PROOFS_DIR from folders.js. Ask for names that lead
// outside the proofs folder, and for proofs a customer really has.
// Your tests run beside the original proofs.js (they must fail), beside a correct fix (they must
// pass), beside a fix that only checks the full path starts with the folder's path (they must
// fail) and beside a fix that gives null for every name (they must fail).
// Run them with: npx vitest run src/proofs.test.js
import { describe, it } from 'vitest'

describe('readProof', () => {
  it('never reads outside the proofs folder', () => {
    throw new Error('Not implemented')
  })
})
