// Turns the results of run() into text a person can read at a glance.
//
// Task 1: A line per test
// Task 2: A summary at the end
// (Task 3 is main() in runner.js.)
import { inspect } from 'node:util'

function reason(error) {
  const text = error instanceof Error ? error.message : inspect(error)
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
}

export function formatReport(results) {
  const lines = []
  for (const result of results) {
    lines.push(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}`)
    if (!result.passed) lines.push(reason(result.error))
  }
  const failed = results.filter((result) => !result.passed).length
  lines.push(`${results.length - failed} passed, ${failed} failed, ${results.length} total`)
  return lines.join('\n')
}
