// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('init')
git('config', 'user.name', 'Kit Oduya')
git('config', 'user.email', 'kit@example.com')
git('add', '.')
git('commit', '-m', 'Add the website as Femi left it')

const visit = join(shop, 'visit.html')
writeFileSync(visit, readFileSync(visit, 'utf8').replace('Saturday: 10:00', 'Saturday: 9:00'))
git('add', 'visit.html')
git('commit', '-m', 'Open at 9:00 on Saturdays')
console.log(git('log', '--oneline'))
