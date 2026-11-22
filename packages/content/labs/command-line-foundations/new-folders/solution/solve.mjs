// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
mkdir receipts
mkdir -p orders/2026/jan orders/2026/feb orders/2026/mar
mkdir "artwork/poster ideas"
touch print-queue.txt
`])
