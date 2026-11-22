// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
mv downloads/*.svg artwork
mv downloads/invoice-* invoices/march
mkdir orders/pellow
mv orders/*-pellow.txt orders/pellow
`])
