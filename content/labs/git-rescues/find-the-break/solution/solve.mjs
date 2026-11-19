// One way to do the rescue. Run `node setup.mjs && node solve.mjs`, then press Check.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, 'repo')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()

const good = git('log', '--format=%H', '--grep', '^Add fare calculator and check$', 'main')
git('bisect', 'start', 'main', good)
const report = git('bisect', 'run', 'node', 'check.mjs')
const firstBad = report.match(/([0-9a-f]{40}) is the first bad commit/)[1]
git('bisect', 'reset')
writeFileSync(join(cwd, 'bisect-result.txt'), `${firstBad}\n`)

const fares = join(cwd, 'fares.mjs')
writeFileSync(fares, readFileSync(fares, 'utf8').replace('> GROUP_SIZE', '>= GROUP_SIZE'))
git('commit', '-am', 'Give groups of exactly four their discount again')
console.log(git('log', '--oneline', '-n', '3'))
console.log(execFileSync('node', ['check.mjs'], { cwd, encoding: 'utf8' }))
