// Fills in notes.txt by moving around with cd, as a learner would.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const sh = (command) => execFileSync('/bin/sh', ['-c', command], { encoding: 'utf8' }).trim()

const inside = sh('cd archive/2025/autumn && pwd')
const back = '../invoices/march'
sh(`cd orders && ls ${back}`)
const proofs = 'cd "client proofs"'
sh(proofs)
writeFileSync(
  'notes.txt',
  `Answers for Idris.\nWrite each answer after its colon, on the same line.\n\ninside: ${inside}\nback: ${back}\nproofs: ${proofs}\n`
)
