// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
grep "Pellow Bakery" sales/web-orders.csv > pellow-bakery.txt
grep -i jam logs/press-mar.log > jams.txt
grep -c unpaid sales/web-orders.csv > unpaid-count.txt
grep -rn "wrong address" messages > wrong-address.txt
`])
