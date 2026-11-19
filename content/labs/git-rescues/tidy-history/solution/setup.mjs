// Issue 5: tidy history before sharing.
//
// Run `node setup.mjs` to build the scenario in ./repo. Running it again starts over.
//
// Your branch route-planner has five scrappy commits on top of main. Your tasks, done with git
// in ./repo:
// 1. Keep a backup branch, route-planner-backup, at the branch's current last commit.
// 2. Turn route-planner into one commit on top of main with the same final content.
// 3. Give that commit a clear message. main must not change.
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

freshRepo()

write('README.md', '# Gullwick Ferries\n\nTimetable and fares for the Gull Island ferry.\n')
commit('Start the ferry repository')
write('timetable.txt', '07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n')
commit('Add timetable')
write('fares.txt', 'adult 6.50\nchild 3.25\nbike 1.00\n')
commit('Add fares table', people.pavel)

author = people.you
git('checkout', '-q', '-b', 'route-planner')
write('planner.mjs', `import { readFileSync } from 'node:fs'

export function sailings() {
  return readFileSync(new URL('./timetable.txt', import.meta.url), 'utf8').trim().split('\\n')
}
`)
commit('wip', people.you)

write('planner.mjs', `import { readFileSync } from 'node:fs'

export function sailings() {
  return readFileSync(new URL('./timetable.txt', import.meta.url), 'utf8')
    .trim()
    .split('\\n')
    .map((line) => {
      const [start, to] = line.split(' -> ')
      return { time: start.slice(0, 5), from: start.slice(6), to }
    })
}

export function nextSailing(from, after) {
  return sailings().find((s) => s.form === from && s.time > after) ?? null
}
`)
commit('wip 2', people.you)

write('planner.mjs', `import { readFileSync } from 'node:fs'

export function sailings() {
  return readFileSync(new URL('./timetable.txt', import.meta.url), 'utf8')
    .trim()
    .split('\\n')
    .map((line) => {
      const [start, to] = line.split(' -> ')
      return { time: start.slice(0, 5), from: start.slice(6), to }
    })
}

export function nextSailing(from, after) {
  return sailings().find((s) => s.from === from && s.time > after) ?? null
}
`)
commit('fix typo', people.you)

write('planner-check.mjs', `import { nextSailing } from './planner.mjs'

console.log(nextSailing('Gullwick', '08:00'))
console.log(nextSailing('Gull Island', '16:00'))
`)
commit('add tests maybe', people.you)

write('planner-check.mjs', `import { nextSailing } from './planner.mjs'

console.log(nextSailing('Gullwick', '08:00'))
console.log(nextSailing('Gull Island', '16:00'), '(no more sailings today)')
`)
commit('fix typo again', people.you)

console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
console.log(`The repository is ready in ./repo, on route-planner.

Your route planner works, but its history is five commits of "wip" and "fix
typo". Before Ines reviews it, keep a backup branch, then squash route-planner
into one commit on top of main with a message that says what it adds. Do not
change main, and do not change the final content of the branch.

Start with: cd repo && git log --oneline main..route-planner`)
