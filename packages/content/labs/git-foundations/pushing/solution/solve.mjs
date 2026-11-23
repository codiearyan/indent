// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('switch', 'gift-vouchers')
git('push')
git('switch', 'main')

// In the editor: the closing line goes under the phone number.
const visit = join(shop, 'visit.html')
const phone = '  <p>Phone: 01632 960 418</p>\n'
writeFileSync(visit, readFileSync(visit, 'utf8').replace(phone, `${phone}  <p>Closed for stocktaking from 10 to 16 August.</p>\n`))
git('add', 'visit.html')
git('commit', '-m', 'Say the shop is closed from 10 to 16 August')

// Rejected: the server has Femi's newest find, which this main does not.
const rejected = spawnSync('git', ['push'], { cwd: shop, env, encoding: 'utf8' })
if (rejected.status === 0) throw new Error('The first push of main was meant to be rejected.')
git('pull', '--no-edit')
git('push')
console.log(git('log', '--oneline', '--graph', '-n', '5'))
