// Copied into the sandbox as .grader/script.mjs and run as a program: node .grader/script.mjs <plan>
// Adds the check's tests and waits for the learner's main(), like a test file does.
import * as runner from '../src/runner.js'

const PLANS = {
  // One test that fails after waiting a moment.
  waitFail: () =>
    runner.test('waits for the paper', async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
      throw new Error('No paper for posters')
    }),
  // One quick test with a long time limit: the program should end as soon as it passes.
  quickLongLimit: () => runner.test('counts the paper', async () => {}, { timeout: 6000 }),
  // The same, for a test that fails at once.
  quickFailLongLimit: () =>
    runner.test(
      'checks the ink',
      async () => {
        throw new Error('Ink is low')
      },
      { timeout: 6000 }
    )
}

PLANS[process.argv[2]]()
await runner.main()
