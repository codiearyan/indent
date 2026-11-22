// One way through the issue, as a learner would type it. Run `node setup.mjs && node solve.mjs`.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const shop = join(import.meta.dirname, 'shop')
const env = { ...process.env, GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd: shop, env, encoding: 'utf8' }).trim()

git('merge', '--abort')
// This merge stops with a conflict, so it exits with an error on purpose.
spawnSync('git', ['merge', '--no-edit', 'june-finds'], { cwd: shop, env })

// In the editor: both books stay, the three marker lines go.
const finds = join(shop, 'finds.html')
const settled = readFileSync(finds, 'utf8')
  .split('\n')
  .filter((line) => !/^(<{7}|={7}|>{7})/.test(line))
  .join('\n')
writeFileSync(finds, settled)
git('add', 'finds.html')
git('commit', '--no-edit')
console.log(git('log', '--oneline', '--graph', '-n', '5'))
