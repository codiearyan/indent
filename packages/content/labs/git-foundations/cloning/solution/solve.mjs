// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const top = import.meta.dirname
const shop = join(top, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const run = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()
const git = (...args) => run(shop, ...args)

run(top, 'clone', 'server/shop.git', 'shop')
// A clone is a new repository: the name and email set in the old shop folder did not come along.
git('config', 'user.name', 'Kit Oduya')
git('config', 'user.email', 'kit@example.com')
git('switch', 'gift-vouchers')

// In the editor: the last sentence of the voucher line changes.
const visit = join(shop, 'visit.html')
writeFileSync(visit, readFileSync(visit, 'utf8').replace('They never expire.', 'They can be used for two years.'))
git('add', 'visit.html')
git('commit', '-m', 'Say that gift vouchers last two years')
console.log(git('status', '--short', '--branch'))
