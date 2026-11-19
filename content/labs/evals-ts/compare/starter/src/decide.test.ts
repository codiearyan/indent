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
import { describe, it } from 'vitest'

describe('decide', () => {
  it('blocks a candidate that breaks a passing case', () => {
    throw new Error('Not implemented')
  })
})
