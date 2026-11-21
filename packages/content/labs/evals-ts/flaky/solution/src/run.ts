// Run with: node src/run.ts [runs]
// Runs every case several times on evals-triage-v3, one seed per run, and flags unstable cases.
import { cases } from './cases.ts'
import { runStabilityEval } from './stability.ts'

const runs = Number(process.argv[2] ?? 5)
const pct = (rate: number): string => `${(rate * 100).toFixed(0)}%`

try {
  const report = await runStabilityEval(cases, 'evals-triage-v3', runs)
  for (const r of report.results) {
    const seeds = r.failingSeeds.length ? `  failing seeds: ${r.failingSeeds.join(', ')}` : ''
    console.log(`  ${r.id} ${r.status.padEnd(11)} ${pct(r.passRate).padStart(4)}${seeds}`)
  }
  console.log(`mean pass rate ${pct(report.meanPassRate)}, stable pass rate ${pct(report.stablePassRate)}`)
  console.log(`flaky: ${report.flaky.join(', ') || '-'}`)
} catch (err) {
  console.log(`Error: ${(err as Error).message}`)
}
