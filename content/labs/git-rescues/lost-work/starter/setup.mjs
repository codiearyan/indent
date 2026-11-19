// Issue 2: get lost work back.
//
// Run `node setup.mjs` to build the scenario in ./repo. Running it again starts over.
//
// Last night two things went wrong in this repository: main was reset two commits too far, and
// the branch harbour-alerts was deleted before it was merged. Your tasks, done with git in ./repo:
// 1. Bring back the branch harbour-alerts, pointing at its last commit.
// 2. Put main back where it was before the reset.
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
write(
  'timetable.txt',
  '# Weekday sailings\n07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n'
)
commit('Add sailing timetable')
write('fares.txt', 'adult 6.50\nchild 3.25\nbike 1.00\n')
commit('Add fares table')

git('checkout', '-q', '-b', 'harbour-alerts')
write('alerts.txt', '# Harbour alerts\n')
commit('Add alerts file', people.pavel)
write('alerts.txt', '# Harbour alerts\nstorm: Sailings may be cancelled at short notice. Check the harbour board.\n')
commit('Add storm alert wording', people.pavel)
write(
  'alerts.txt',
  '# Harbour alerts\nstorm: Sailings may be cancelled at short notice. Check the harbour board.\nfog: Sailings run at reduced speed. Expect delays of up to 20 minutes.\n'
)
commit('Add fog alert wording', people.pavel)

git('checkout', '-q', 'main')
write(
  'timetable.txt',
  '# Weekday sailings\n07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n\nIn winter the 15:00 sailing leaves at 14:30.\n'
)
commit('Add winter timetable note')
write(
  'README.md',
  '# Gullwick Ferries\n\nTimetable and fares for the Gull Island ferry.\n\nBikes ride free in the rack on the upper deck.\n'
)
commit('Add bike rack notice')

author = people.you
git('reset', '-q', '--hard', 'HEAD~2')
git('branch', '-q', '-D', 'harbour-alerts')

console.log(git('log', '--oneline', '--graph', '--decorate', '--all'))
console.log(`The repository is ready in ./repo. This is all that is left after last night.

Main lost its two newest commits to a reset that went too far, and the branch
harbour-alerts (three commits by Pavel, never merged) was deleted. Nothing was
pushed, so git log cannot show them any more. Bring both back.

Start with: cd repo && git reflog`)
