// Chapter 3: resolve a merge conflict.
//
// Run `node setup.mjs` to build the scenario in ./repo. Running it again starts over.
//
// Ines and Pavel both changed timetable.txt and fares.txt on separate branches. Your tasks, done
// with git in ./repo:
// 1. Merge weekend-sailings into main and keep both new sailings, in time order.
// 2. Keep both changes to the adult fare line.
// 3. Finish the merge with a merge commit and a clean working tree.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { dirname, join } from 'node:path'

const repo = join(import.meta.dirname, 'repo')
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

const sailings = (...extra) =>
  [
    '# Sailings',
    '07:00 Gullwick -> Gull Island',
    ...extra,
    '09:00 Gull Island -> Gullwick',
    '12:00 Gullwick -> Gull Island',
    '15:00 Gull Island -> Gullwick',
    ''
  ].join('\n')

freshRepo()

write('README.md', '# Gullwick Ferries\n\nTimetable and fares for the Gull Island ferry.\n')
write('timetable.txt', sailings())
write('fares.txt', 'adult 6.50\nchild 3.25\nbike 1.00\n')
commit('Add timetable and fares')

git('checkout', '-q', '-b', 'weekend-sailings')
write('timetable.txt', sailings('08:30 Gull Island -> Puffin Rock'))
commit('Add Puffin Rock sailing', people.pavel)
write('fares.txt', 'adult (16+) 6.50\nchild 3.25\nbike 1.00\n')
commit('Show the age for adult fares', people.pavel)
write('weekend.txt', 'The Puffin Rock sailing runs on Saturdays and Sundays from April to October.\n')
commit('Add weekend note', people.pavel)

git('checkout', '-q', 'main')
write('timetable.txt', sailings('08:00 Gullwick -> Seal Bay'))
commit('Add Seal Bay sailing')
write('fares.txt', 'adult 7.00\nchild 3.25\nbike 1.00\n')
commit('Raise adult fare to 7.00')

console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
console.log(`The repository is ready in ./repo, on main.

Ines added an 08:00 Seal Bay sailing and raised the adult fare on main. Pavel
added an 08:30 Puffin Rock sailing and labelled the adult fare with its age on
weekend-sailings. Merge weekend-sailings into main so both of their changes
survive, then finish the merge.

Start with: cd repo && git merge weekend-sailings`)
