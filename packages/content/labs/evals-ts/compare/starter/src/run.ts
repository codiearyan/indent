// Run with: node src/run.ts [baseline] [candidate]
// Compares two triage models on the same cases and applies the ship rule.
import { cases } from './cases.ts'
import { compareModels } from './decide.ts'

const [baseline = 'evals-triage-v1', candidate = 'evals-triage-v2'] = process.argv.slice(2)
const pct = (rate: number): string => `${(rate * 100).toFixed(0)}%`

try {
  const { comparison: c, decision } = await compareModels(cases, baseline, candidate)
  console.log(`${c.baseline} ${pct(c.baselineRate)} -> ${c.candidate} ${pct(c.candidateRate)}`)
  console.log(`  fixed:     ${c.fixed.join(', ') || '-'}`)
  console.log(`  broken:    ${c.broken.join(', ') || '-'}`)
  console.log(`  unchanged: ${c.unchanged.length} cases`)
  console.log(decision.ship ? 'Ship it.' : 'Do not ship:')
  for (const reason of decision.reasons) console.log(`  - ${reason}`)
} catch (err) {
  console.log(`Error: ${(err as Error).message}`)
}
