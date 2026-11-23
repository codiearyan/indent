// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
cat > evening.sh <<'END'
#!/bin/sh
echo "Orders today:"
wc -l < orders/today.csv
echo "Unpaid:"
grep -c unpaid orders/today.csv
END
chmod u+x evening.sh
cat > count.sh <<'END'
#!/bin/sh
# Counts the orders in the file given as the first argument. Sol, 2025.
wc -l < "$1" && echo "Counted."
END
`])
