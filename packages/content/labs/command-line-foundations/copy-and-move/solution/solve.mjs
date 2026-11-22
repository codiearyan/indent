// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
mv invoice-0303.csv invoices/march
mv artwork/fox-poster-FINAL-v2-REAL.svg artwork/fox-poster.svg
cp prices.csv prices-2025.csv
cp -r orders orders-backup
`])
