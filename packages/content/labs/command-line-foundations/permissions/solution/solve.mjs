// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
chmod a-w prices.csv
chmod go-rwx accounts/bank-details.txt
chmod a-w archive/*.csv
chmod u+w prices.csv
sed 's/^fox poster A3,18.00$/fox poster A3,22.00/' prices.csv > new-prices.csv
cat new-prices.csv > prices.csv
rm new-prices.csv
chmod a-w prices.csv
`])
