// One way to do the rescue. Run `node setup.mjs && node solve.mjs`, then press Check.
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const cwd = join(import.meta.dirname, 'repo')
const env = { ...process.env, GIT_EDITOR: 'true', GIT_PAGER: 'cat' }
const git = (...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim()

git('switch', 'route-planner')
git('branch', 'route-planner-backup')
git('reset', '--soft', 'main')
git(
  'commit',
  '-m', 'Add a route planner that finds the next sailing',
  '-m', 'nextSailing(from, after) reads timetable.txt and returns the first sailing\nfrom that harbour after the given time. planner-check.mjs shows two examples.'
)
console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
