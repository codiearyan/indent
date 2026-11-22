// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('commit', '--amend', '-m', 'Mention the Thursday late opening')

const finds = join(shop, 'finds.html')
writeFileSync(finds, readFileSync(finds, 'utf8').replace('£2.50</p>', '£3.20</p>'))
git('add', 'finds.html')
git(
  'commit',
  '-m', 'Raise postage to 3.20',
  '-m', 'The courier put its price up on 1 March, and at 2.50 the shop was paying for part of every parcel.'
)
console.log(git('log', '-n', '2'))
