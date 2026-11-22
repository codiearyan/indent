// Turns the results of run() into text a person can read at a glance.
//
// Task 1: A line per test
// Task 2: A summary at the end
// (Task 3 is main() in runner.js.)
import { inspect } from 'node:util'

// Tasks 1 and 2
// formatReport(results) returns one string, its lines joined with '\n'.
// Task 1: for each result, in order, a line 'PASS <name>' or 'FAIL <name>'. Under a failed
// test comes its reason, every line of it indented by two spaces: an Error's message, or for
// anything else that was thrown, the value written with inspect().
// Task 2: the last line is a summary: '<p> passed, <f> failed, <n> total'.
export function formatReport(results) {
  throw new Error('Not implemented')
}
