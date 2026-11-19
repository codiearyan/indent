// Chapter 1: undo a commit everyone already has.
//
// Run `node setup.mjs` to build the scenario in ./repo (and its shared remote in ./.shared.git).
// Running it again throws away your changes and starts the scenario over.
//
// Your tasks, done with git inside ./repo:
// 1. Undo Pavel's bad fares commit on main without rewriting the history that is already shared.
// 2. Push the fix to the shared remote (origin) without forcing anything.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { dirname, join } from 'node:path'

const repo = join(import.meta.dirname, 'repo')
const remote = join(import.meta.dirname, '.shared.git')
const people = {
  ines: ['Ines Calder', 'ines@gullwick.example'],
  pavel: ['Pavel Sorensen', 'pavel@gullwick.example'],
  you: ['You at Gullwick', 'you@gullwick.example']
}
let clock = 1772442000
let author = people.ines

function git(...args) {
  clock += 900
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C',
    GIT_AUTHOR_NAME: author[0],
    GIT_AUTHOR_EMAIL: author[1],
    GIT_COMMITTER_NAME: author[0],
    GIT_COMMITTER_EMAIL: author[1],
    GIT_AUTHOR_DATE: `${clock} +0000`,
    GIT_COMMITTER_DATE: `${clock} +0000`
  }
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[key]
  return execFileSync('git', args, { cwd: repo, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function write(file, text) {
  mkdirSync(dirname(join(repo, file)), { recursive: true })
  writeFileSync(join(repo, file), text)
}

function commit(message, who = people.ines) {
  author = who
  git('add', '-A')
  git('commit', '-q', '--no-verify', '-m', message)
}

function freshRepo() {
  mkdirSync(repo, { recursive: true })
  for (const entry of readdirSync(repo)) rmSync(join(repo, entry), { recursive: true, force: true })
  git('init', '-q', '-b', 'main')
  const local = {
    'user.name': people.you[0],
    'user.email': people.you[1],
    'commit.gpgsign': 'false',
    'tag.gpgsign': 'false',
    'core.autocrlf': 'false',
    'core.hooksPath': '.git/no-hooks',
    'core.logAllRefUpdates': 'true',
    'gc.auto': '0'
  }
  for (const [key, value] of Object.entries(local)) git('config', key, value)
}

freshRepo()
rmSync(remote, { recursive: true, force: true })

write('README.md', '# Gullwick Ferries\n\nTimetable and fares for the Gull Island ferry.\n')
write(
  'timetable.txt',
  '# Weekday sailings\n07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n'
)
commit('Add sailing timetable')

write('fares.txt', 'adult 6.50\nchild 3.25\nbike 1.00\n')
commit('Add fares table')

write('fares.txt', 'adult 65.00\nchild 32.50\nbike 10.00\n')
commit('Load spring fares', people.pavel)

write(
  'timetable.txt',
  '# Weekday sailings\n07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n\n# Sunday sailings\n10:00 Gullwick -> Gull Island\n16:00 Gull Island -> Gullwick\n'
)
commit('Add Sunday sailings')

git('init', '-q', '--bare', '-b', 'main', remote)
git('-C', remote, 'config', 'receive.denyNonFastForwards', 'true')
git('-C', remote, 'config', 'receive.denyDeletes', 'true')
git('remote', 'add', 'origin', '../.shared.git')
git('push', '-q', '-u', 'origin', 'main')

console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
console.log(`The repository is ready in ./repo, and main is already pushed to origin.

Pavel's commit "Load spring fares" put every price up tenfold, and the whole crew
has already pulled it. Undo that commit on main without rewriting shared history,
keep the Sunday sailings, then push the fix to origin.

Start with: cd repo && git log --oneline`)
