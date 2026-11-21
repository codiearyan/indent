// One way to do the rescue. Run `node setup.mjs && node solve.mjs`, then press Check.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, 'repo')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()

try {
  git('merge', '--no-ff', '--no-edit', 'weekend-sailings')
} catch {
  console.log('The merge stopped on conflicts, as expected.')
}

const resolve = (file, edit) => {
  const text = readFileSync(join(cwd, file), 'utf8')
  writeFileSync(join(cwd, file), edit(text))
}
const keepBoth = /<<<<<<< .*\n([\s\S]*?)(?:\|{7}[\s\S]*?)?=======\n([\s\S]*?)>>>>>>> .*\n/
resolve('timetable.txt', (text) => text.replace(keepBoth, '$1$2'))
resolve('fares.txt', (text) => text.replace(keepBoth, 'adult (16+) 7.00\n'))
git('add', 'timetable.txt', 'fares.txt')
git('commit', '--no-edit')
console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
