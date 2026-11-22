// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

// What the learner types into .gitignore in the editor.
writeFileSync(join(shop, '.gitignore'), "# The till's stock export\nstock.csv\n\n# Femi's drafts\ndrafts/\n\nupload.log\n")
git('rm', '--cached', 'upload.log')
git('add', '.gitignore')
git('commit', '-m', 'Ignore the stock export, the drafts and the upload log')
console.log(git('status', '--short'))
