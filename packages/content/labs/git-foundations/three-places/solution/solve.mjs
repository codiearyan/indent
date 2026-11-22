// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('add', 'finds.html')
git('commit', '-m', 'Add two finds for March')

const visit = join(shop, 'visit.html')
writeFileSync(visit, readFileSync(visit, 'utf8').replace('01632 960 481', '01632 960 418'))
git('add', 'visit.html')
git('commit', '-m', "Add the shop's phone number")

git('add', 'events.html')
console.log(git('status', '--short'))
