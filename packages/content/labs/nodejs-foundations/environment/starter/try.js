// Runs one of your scripts and shows what it printed to each stream, and the exit code it ended
// with. Before the script's name you can put settings, NAME=value, which go into the script's
// environment the same way in every terminal, and --memory=16, which gives the script's data
// 16 MB at most. For example:
//   node try.js water-bill.js 2400
//   node try.js WATER_PRICE=2.10 water-bill.js 2400
//   node try.js --memory=16 count-readings.js water/year.txt
import { spawnSync } from 'node:child_process'

const words = process.argv.slice(2)
const settings = {}
const flags = []
while (words.length > 0) {
  const setting = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(words[0])
  const memory = /^--memory=(\d+)$/.exec(words[0])
  if (setting) settings[setting[1]] = setting[2]
  else if (memory) flags.push(`--max-old-space-size=${memory[1]}`)
  else break
  words.shift()
}
const [script, ...args] = words

if (script === undefined) {
  console.error('Name the script to try, for example: node try.js water-bill.js 2400')
  process.exitCode = 1
} else {
  const run = spawnSync(process.execPath, [...flags, script, ...args], {
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, ...settings }
  })
  const outOfMemory = /JavaScript heap out of memory/.test(run.stderr)
  const stderr = outOfMemory
    ? run.stderr.split('\n').filter((l) => l.startsWith('FATAL ERROR')).join('\n')
    : run.stderr
  const show = (text) =>
    text === '' ? '  (nothing)' : text.replace(/\n$/, '').split('\n').map((l) => `  ${l}`).join('\n')

  console.log('standard output:')
  console.log(show(run.stdout))
  console.log('standard error:')
  console.log(show(stderr))
  if (outOfMemory) console.log('stopped: it ran out of memory')
  else console.log(run.status === null ? 'stopped after 10 seconds' : `exit code: ${run.status}`)
}
