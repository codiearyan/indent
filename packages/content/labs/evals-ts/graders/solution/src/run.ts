// Run with: node src/run.ts
// Grades evals-triage-json on the cases in src/cases.ts and prints a score per case.
import { cases } from './cases.ts'
import { runSuite } from './suite.ts'

try {
  const report = await runSuite(cases, 'evals-triage-json')
  console.log(`${report.model}: ${report.passed}/${report.total} fully passed, mean score ${report.meanScore.toFixed(2)}`)
  for (const r of report.results) {
    console.log(`  ${r.id} ${r.score.toFixed(2)}${r.reasons.map((reason) => `\n    - ${reason}`).join('')}`)
  }
} catch (err) {
  console.log(`Error: ${(err as Error).message}`)
}
