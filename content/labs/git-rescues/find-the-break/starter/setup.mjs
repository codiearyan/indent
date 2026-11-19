// Issue 4: find the commit that broke it.
//
// Run `node setup.mjs` to build the scenario in ./repo. Running it again starts over.
//
// `node check.mjs` (inside ./repo) passes on the first commit with fares.mjs and fails on the
// newest one. Your tasks, done with git in ./repo:
// 1. Use git bisect to find the first bad commit and write its hash in repo/bisect-result.txt.
// 2. Fix the bug on main in a new commit, end the bisect and leave the tree clean.
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

const CHECK = `import { ticketTotal } from './fares.mjs'

const cases = [
  [['adult'], 650],
  [['adult', 'child'], 975],
  [['adult', 'adult', 'child', 'child'], 1755],
  [['adult', 'adult', 'adult', 'adult', 'adult'], 2925]
]

let failed = 0
for (const [tickets, want] of cases) {
  const got = ticketTotal(tickets)
  if (got !== want) failed++
  console.log(\`\${got === want ? 'ok  ' : 'FAIL'} \${tickets.join(' + ')} = \${got} (want \${want})\`)
}
process.exit(failed ? 1 : 0)
`

const fares = (body) => body.trim() + '\n'

freshRepo()

write('.gitignore', 'bisect-result.txt\n')
write('README.md', '# Gullwick Ferries\n\nTimetable, fares and the fare calculator for the Gull Island ferry.\n')
commit('Start the ferry repository')

write('check.mjs', CHECK)
write('fares.mjs', fares(`
const PRICES = { adult: 650, child: 325 }

// Prices are in pence. Groups of four or more get 10% off.
export function ticketTotal(tickets) {
  let total = 0
  for (const kind of tickets) total += PRICES[kind]
  if (tickets.length >= 4) total = Math.round(total * 0.9)
  return total
}
`))
commit('Add fare calculator and check')

write('timetable.txt', '07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n')
commit('Add timetable')

write('README.md', '# Gullwick Ferries\n\nTimetable, fares and the fare calculator for the Gull Island ferry.\n\nRun `node check.mjs` before you push a fare change.\n')
commit('Explain the fare check in the README')

write('fares.mjs', fares(`
const PRICES = { adult: 650, child: 325 }
const GROUP_SIZE = 4
const GROUP_DISCOUNT = 0.9

// Prices are in pence. Groups of GROUP_SIZE or more get a discount.
export function ticketTotal(tickets) {
  let total = 0
  for (const kind of tickets) total += PRICES[kind]
  if (tickets.length >= GROUP_SIZE) total = Math.round(total * GROUP_DISCOUNT)
  return total
}
`))
commit('Name the group discount constants', people.pavel)

write('timetable.txt', '07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n')
commit('Add afternoon sailing')

write('fares.mjs', fares(`
const PRICES = { adult: 650, child: 325 }
const GROUP_SIZE = 4
const GROUP_DISCOUNT = 0.9

const subtotal = (tickets) => tickets.reduce((sum, kind) => sum + PRICES[kind], 0)

// Prices are in pence. Groups of GROUP_SIZE or more get a discount.
export function ticketTotal(tickets) {
  const total = subtotal(tickets)
  return tickets.length > GROUP_SIZE ? Math.round(total * GROUP_DISCOUNT) : total
}
`))
commit('Tidy the fare calculator', people.pavel)

write('fares.mjs', fares(`
const PRICES = { adult: 650, child: 325, bike: 100 }
const GROUP_SIZE = 4
const GROUP_DISCOUNT = 0.9

const subtotal = (tickets) => tickets.reduce((sum, kind) => sum + PRICES[kind], 0)
const people = (tickets) => tickets.filter((kind) => kind !== 'bike').length

// Prices are in pence. Groups of GROUP_SIZE or more people get a discount. Bikes do not count.
export function ticketTotal(tickets) {
  const total = subtotal(tickets)
  return people(tickets) > GROUP_SIZE ? Math.round(total * GROUP_DISCOUNT) : total
}
`))
commit('Add bike tickets', people.pavel)

write('README.md', '# Gullwick Ferries\n\nTimetable, fares and the fare calculator for the Gull Island ferry.\n\nRun `node check.mjs` before you push a fare change.\n\nIn winter the 15:00 sailing leaves at 14:30.\n')
commit('Add winter note to the README')

write('timetable.txt', '07:00 Gullwick -> Gull Island\n09:00 Gull Island -> Gullwick\n12:00 Gullwick -> Gull Island\n15:00 Gull Island -> Gullwick\n18:00 Gullwick -> Gull Island\n')
commit('Add evening sailing')

console.log(git('log', '--oneline', '--decorate'))
console.log(`The repository is ready in ./repo, on main.

Ines: "The ticket desk charged a family of four the full price this morning.
Groups of four always got 10% off." Inside repo, \`node check.mjs\` fails on main
but passed back when the fare calculator was added. Find the first bad commit
with git bisect, write its hash in repo/bisect-result.txt, then fix the bug on
main in a new commit.

Start with: cd repo && node check.mjs`)
