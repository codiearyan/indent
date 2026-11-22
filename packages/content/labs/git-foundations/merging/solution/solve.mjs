// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('merge', 'summer-sale')
git('merge', '--no-edit', 'reading-group')
git('branch', '-d', 'summer-sale', 'reading-group')
console.log(git('log', '--oneline', '--graph', '--all', '-n', '6'))
