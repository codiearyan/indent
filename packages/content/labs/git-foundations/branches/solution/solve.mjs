// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()
const edit = (file, from, to) => {
  const path = join(shop, file)
  writeFileSync(path, readFileSync(path, 'utf8').replace(from, to))
}

git('switch', '-c', 'summer-sale')
edit('index.html', 'since 1998.</p>\n', 'since 1998.</p>\n  <p>Summer sale: every book half price, 1 to 31 July.</p>\n')
git('add', 'index.html')
git('commit', '-m', 'Announce the summer sale on the home page')
git('switch', 'main')
edit('events.html', 'at 18:30', 'at 19:00')
git('add', 'events.html')
git('commit', '-m', 'Move the reading group to 19:00')
console.log(git('log', '--oneline', '--graph', '--all', '-n', '4'))
