// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()
const edit = (file, change) => writeFileSync(join(shop, file), change(readFileSync(join(shop, file), 'utf8')))

// Reading the history: the commit that took the Sunday line off visit.html, and the line itself.
const culprit = git('log', '--format=%h', '-S', 'Sunday:', '--', 'visit.html').split('\n')[0]
const line = git('show', '--no-color', culprit, '--', 'visit.html').split('\n').find((l) => l.startsWith('-') && l.includes('Sunday'))
edit('visit.html', (text) =>
  text.replace(/( *<li>Late opening)/, `${line.slice(1)}\n$1`)
)
git('add', 'visit.html')
git('commit', '-m', `Put back the Sunday hours removed in ${culprit}`)

// Reviewing Femi's change before committing it: one book was removed by accident.
const removed = git('diff', '--no-color', 'finds.html').split('\n').find((l) => l.startsWith('-') && l.includes('<li>'))
edit('finds.html', (text) => text.replace(/( *<li>Seven Lamps)/, `${removed.slice(1)}\n$1`))
git('add', 'finds.html')
git('commit', '-m', 'Add two finds for April')
console.log(git('log', '--oneline', '-n', '3'))
