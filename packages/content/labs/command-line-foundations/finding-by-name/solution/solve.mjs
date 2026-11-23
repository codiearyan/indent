// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
find old-sticks -name "*.svg" > drawings.txt
find old-sticks -iname "*invoice*" > invoices.txt
find old-sticks -type d -name proofs > proof-folders.txt
`])
