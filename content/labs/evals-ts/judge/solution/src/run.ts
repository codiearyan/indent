// Run with: node src/run.ts
// Drafts a reply for every ticket and asks the judge model to grade it against RUBRIC.
// The second run adds a rule the judge has no way to check.
import { evaluateDrafts } from './judge.ts'
import { RUBRIC, tickets } from './tickets.ts'

async function show(title: string, rubric: string[]): Promise<void> {
  console.log(`\n${title}`)
  try {
    const report = await evaluateDrafts(tickets, rubric)
    for (const r of report.results) console.log(`  ${r.id} ${r.verdict.padEnd(7)} ${r.reason}`)
    const percent = (report.passRate * 100).toFixed(0)
    console.log(`  pass ${report.pass}, fail ${report.fail}, unknown ${report.unknown}, pass rate ${percent}%`)
  } catch (err) {
    console.log(`  Error: ${(err as Error).message}`)
  }
}

await show('Team rubric', RUBRIC)
await show('Team rubric plus a tone rule', [...RUBRIC, 'Sounds warm and friendly.'])
