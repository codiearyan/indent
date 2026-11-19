// Run with: node src/run.ts [model]
// Scores a triage model on data/tickets.jsonl. Try evals-triage-v1 and evals-triage-v2.
import { loadCases } from './cases.ts'
import { runEval } from './evaluate.ts'

const model = process.argv[2] ?? 'evals-triage-v1'

try {
  const report = await runEval(loadCases('data/tickets.jsonl'), model)
  const percent = (report.passRate * 100).toFixed(0)
  console.log(`${report.model}: ${report.passed}/${report.total} passed (${percent}%)`)
  for (const f of report.failures) console.log(`  ${f.id}: expected ${f.expected}, got ${f.got}`)
} catch (err) {
  console.log(`Error: ${(err as Error).message}`)
}
