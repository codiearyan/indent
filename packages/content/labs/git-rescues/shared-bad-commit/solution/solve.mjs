// One way to do the rescue. Run `node setup.mjs && node solve.mjs`, then press Check.
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, 'repo')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()

const bad = git('log', '--format=%H', '--grep', '^Load spring fares$', 'main')
git('revert', '--no-edit', bad)
git('push', 'origin', 'main')
console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
