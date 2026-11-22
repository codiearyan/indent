// Fills in notes.txt with what pwd, ls -S and ls -a print, as a learner would.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const sh = (command) => execFileSync('/bin/sh', ['-c', command], { encoding: 'utf8' }).trim()

const here = sh('pwd')
const biggest = sh('ls -S artwork').split('\n')[0]
const hidden = sh('ls -a desk').split('\n').find((name) => name.startsWith('.') && name !== '.' && name !== '..')
writeFileSync(
  'notes.txt',
  `Answers for Idris.\nWrite each answer after its colon, on the same line.\n\nhere: ${here}\nbiggest: ${biggest}\nhidden: ${hidden}\n`
)
