// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
cat mailing/market-signups.txt mailing/shop-signups.txt > mailing-list.txt
head -n 11 sales/web-orders.csv > first-orders.txt
tail -n 8 logs/press-mar.log > last-entries.txt
wc -l logs/*.log > entry-counts.txt
`])
