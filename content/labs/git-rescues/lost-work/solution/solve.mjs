// One way to do the rescue. Run `node setup.mjs && node solve.mjs`, then press Check.
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, 'repo')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()

const reflog = git('reflog', '--format=%H %gs').split('\n')
const fogTip = reflog.find((line) => line.endsWith('commit: Add fog alert wording')).split(' ')[0]
git('branch', 'harbour-alerts', fogTip)
git('reset', '--hard', 'main@{1}')
console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
