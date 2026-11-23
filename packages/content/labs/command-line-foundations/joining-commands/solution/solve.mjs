// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
sort market/sold.txt | uniq > items.txt
sort market/sold.txt | uniq -c | sort -rn | head -n 5 > top-five.txt
grep finished logs/today.log >> jobs-done.txt
sort stock.txt > stock-sorted.txt
mv stock-sorted.txt stock.txt
`])
