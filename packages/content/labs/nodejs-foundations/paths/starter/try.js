// Runs one of your scripts and shows what it printed to each stream, and the exit code it ended
// with. For example: node try.js where.js
import { spawnSync } from 'node:child_process'

const [script, ...args] = process.argv.slice(2)

if (script === undefined) {
  console.error('Name the script to try, for example: node try.js where.js')
  process.exitCode = 1
} else {
  const run = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000 })
  const show = (text) =>
    text === '' ? '  (nothing)' : text.replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')

  console.log('standard output:')
  console.log(show(run.stdout))
  console.log('standard error:')
  console.log(show(run.stderr))
  console.log(run.status === null ? 'stopped after 10 seconds' : `exit code: ${run.status}`)
}
