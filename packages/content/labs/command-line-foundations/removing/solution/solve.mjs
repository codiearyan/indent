// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
rm "artwork/fox-poster copy.svg"
rm downloads/*.tmp
mv old-site/logo.svg artwork
rm -r old-site
`])
