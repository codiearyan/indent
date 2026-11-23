// Runs the commands the tasks ask for, in a real shell.
import { execFileSync } from 'node:child_process'

execFileSync('/bin/sh', ['-c', `
echo $HOME > home.txt
SHOP_NAME="Ashgrove Press"
export SHOP_NAME
sh label.sh > label.txt
chmod u+x bin/stamp
echo "export PATH=\\"$PWD/bin:\\$PATH\\"" >> shop-settings.sh
echo 'export SHOP_NAME="Ashgrove Press"' >> shop-settings.sh
`])
