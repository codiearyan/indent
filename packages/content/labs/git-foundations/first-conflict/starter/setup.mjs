// Builds the shop's folder, shop/, as a Git repository with the history this issue needs.
// Run it in the top folder with: node setup.mjs
// Running it again empties shop/ and starts the issue over. Your own Git settings are not touched.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { join } from 'node:path'

const top = import.meta.dirname
const shop = join(top, 'shop')
const people = {
  wilma: ['Wilma Quarrie', 'wilma@pennywhistle.example'],
  femi: ['Femi Adeyemi', 'femi@pennywhistle.example'],
  you: ['You', 'you@pennywhistle.example']
}
let clock = Date.UTC(2026, 1, 21, 9, 30) / 1000

function git(who, ...args) {
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C',
    GIT_AUTHOR_NAME: who[0],
    GIT_AUTHOR_EMAIL: who[1],
    GIT_COMMITTER_NAME: who[0],
    GIT_COMMITTER_EMAIL: who[1],
    GIT_AUTHOR_DATE: `${clock} +0000`,
    GIT_COMMITTER_DATE: `${clock} +0000`
  }
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete env[key]
  return execFileSync('git', args, { cwd: shop, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const write = (file, text) => writeFileSync(join(shop, file), text)

function commit(who, message, days = 3) {
  git(who, 'add', '-A')
  git(who, 'commit', '-q', '--no-verify', '-m', message)
  clock += days * 86400 + 2000
}

// A repository made by mistake in the top folder would hold the app's own files.
rmSync(join(top, '.git'), { recursive: true, force: true })
// Emptied rather than removed, so a terminal sitting in shop/ keeps a folder to stand in.
mkdirSync(shop, { recursive: true })
for (const entry of readdirSync(shop)) rmSync(join(shop, entry), { recursive: true, force: true })
git(people.you, 'init', '-q', '-b', 'main')
const settings = {
  'user.name': people.you[0],
  'user.email': people.you[1],
  'commit.gpgsign': 'false',
  'core.autocrlf': 'false',
  'core.hooksPath': '.git/no-hooks',
  'core.excludesFile': join(shop, '.git', 'no-excludes'),
  'merge.ff': 'true',
  'merge.conflictStyle': 'merge',
  'gc.auto': '0'
}
for (const [key, value] of Object.entries(settings)) git(people.you, 'config', key, value)

const page = (title, body) =>
  `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>${title}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${body}</body>\n</html>\n`
const list = (items) => `  <ul>\n${items.map((item) => `    <li>${item}</li>\n`).join('')}  </ul>\n`
const back = '  <p><a href="index.html">Back to the shop</a></p>\n'

const style = `body {
  font-family: Georgia, serif;
  max-width: 40rem;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #2b2118;
  background: #fbf7f0;
}

h1 {
  font-size: 1.8rem;
}

a {
  color: #7a3b12;
}
`

const index = (links) =>
  page(
    'Pennywhistle Books',
    '  <h1>Pennywhistle Books</h1>\n  <p>Second-hand books on Bramley Row, bought and sold since 1998.</p>\n' +
      list(links)
  )
const homeLinks = [
  '<a href="visit.html">Visit the shop</a>',
  '<a href="finds.html">This week\'s finds</a>'
]

const visit = ({ details, heading = 'Opening hours', hours }) =>
  page(
    'Visit Pennywhistle Books',
    '  <h1>Visit the shop</h1>\n' +
      details.map((line) => `  <p>${line}</p>\n`).join('') +
      `  <h2>${heading}</h2>\n` +
      list(hours) +
      back
  )
const address = '9 Bramley Row, Orrinford'
const phone = 'Phone: 01632 960 418'
const weekdays = 'Tuesday to Friday: 10:00 to 17:30'
const sunday = 'Sunday: 11:00 to 16:00'

const finds = (books, postage = '2.50') =>
  page(
    'This week\'s finds',
    '  <h1>This week\'s finds</h1>\n' + list(books) + `  <p>Postage on any order: £${postage}</p>\n` + back
  )
const march = [
  'Moths of the Lower Fen, Ada Merriman, hardback, £6.00',
  'An Atlas of Small Rivers, Tobias Greaves, paperback, £3.50',
  'Seven Lamps on Quillon Street, Rosamund Pell, paperback, £4.00'
]
const marchNew = [
  'The Tidecaller\'s Almanac, Hal Brennick, hardback, £7.50',
  'Notes from a Copper Town, Margit Svensen, paperback, £3.00'
]

const events = page(
  'Reading group',
  '  <h1>Reading group</h1>\n  <p>We meet on the first Thursday of the month at 18:30, among the shelves.</p>\n  <p>This month: Seven Lamps on Quillon Street. Tea is on the shop.</p>\n' +
    back
)

const saturday = 'Saturday: 9:00 to 17:00'
write('index.html', index(homeLinks))
write('visit.html', visit({ details: [address], hours: [weekdays, 'Saturday: 10:00 to 17:00', sunday] }))
write('finds.html', finds(march))
write('style.css', style)
commit(people.you, "Add the shop's website", 1)

write('visit.html', visit({ details: [address], hours: [weekdays, saturday, sunday] }))
commit(people.you, 'Open at 9:00 on Saturdays', 6)

write('finds.html', finds([...march, ...marchNew]))
commit(people.you, 'Add two finds for March', 1)

write('visit.html', visit({ details: [address, phone], hours: [weekdays, saturday, sunday] }))
commit(people.you, "Add the shop's phone number", 2)

write('events.html', events)
commit(people.wilma, 'Add the reading group page', 4)

const late = 'Late opening on Thursdays until 20:00'
write('visit.html', visit({ details: [address, phone], hours: [weekdays, saturday, sunday, late] }))
commit(people.femi, 'Mention the Thursday late opening', 2)

write('finds.html', finds([...march, ...marchNew], '3.20'))
commit(
  people.you,
  'Raise postage to 3.20\n\nThe courier put its price up on 1 March, and at 2.50 the shop was\npaying for part of every parcel.',
  5
)

const tidyHours = [weekdays, saturday, late]
write('visit.html', visit({ details: [address, phone], heading: 'When we are open', hours: tidyHours }))
commit(people.femi, 'Tidy up the visit page', 3)

write('index.html', index([...homeLinks, '<a href="events.html">Reading group</a>']))
commit(people.femi, 'Link the reading group from the home page', 2)

const april = [
  'The Marrowby Sisters, Hal Brennick, paperback, £3.50',
  'A Kettle for Grandmother Ash, Clem Dorrity, paperback, £2.50'
]

const tidy = git(people.you, 'log', '-1', '--format=%h', '--abbrev=7', 'HEAD~1').trim()
const hours = [weekdays, saturday, sunday, late]
write('visit.html', visit({ details: [address, phone], heading: 'When we are open', hours }))
commit(people.you, `Put back the Sunday hours removed in ${tidy}`, 1)

write('finds.html', finds([...march, ...marchNew, ...april], '3.20'))
commit(people.you, 'Add two finds for April', 4)


const ferns = 'Ferns and Their Keepers, Clem Dorrity, hardback, £5.00'
const books = [...march, ...marchNew, ...april, ferns]
write('finds.html', finds(books, '3.20'))
commit(people.you, 'Add Ferns and Their Keepers to the finds', 2)

const intro = 'Second-hand books on Bramley Row, bought and sold since 1998.'
const links = [...homeLinks, '<a href="events.html">Reading group</a>']
const home = (line) => index(links).replace(intro, line)
const orchard = 'The Orchard Ledger, Ines Corrow, hardback, £6.50'
const lamp = 'A Lamp on Gull Island, Bertram Okafor, paperback, £3.00'
const tip = git(people.you, 'rev-parse', 'HEAD').trim()

git(people.femi, 'checkout', '-q', '-b', 'window-display')
write('index.html', home('Second-hand books on Bramley Row. This month our window is all sea stories.'))
commit(people.femi, 'Mention the window display on the home page', 1)

git(people.femi, 'checkout', '-q', '-b', 'june-finds', tip)
write('finds.html', finds([...books, lamp], '3.20'))
commit(people.femi, 'Add A Lamp on Gull Island to the finds', 1)

git(people.wilma, 'checkout', '-q', 'main')
write('index.html', home('Second-hand books on Bramley Row since 1998. Open late on Thursdays.'))
commit(people.wilma, 'Mention the late opening on the home page', 1)
write('finds.html', finds([...books, orchard], '3.20'))
commit(people.wilma, 'Add The Orchard Ledger to the finds', 1)

// Femi's Saturday: he started merging window-display, met a conflict and left it as it is.
let stopped = false
try {
  git(people.femi, 'merge', '--no-edit', 'window-display')
} catch (error) {
  stopped = /CONFLICT/.test(error.stdout)
}
if (!stopped) throw new Error('The merge in setup was meant to stop with a conflict.')

console.log(git(people.you, 'log', '--oneline', '--graph', '--all', '-n', '6'))
console.log(git(people.you, 'status', '--short'))
console.log(`The shop's folder is ready in shop/. You are on main.

Femi started merging his window-display branch into main on Saturday, Git
stopped with a conflict, and he left it like that. Wilma has not said yes to
that branch. Then june-finds, with his new book, is ready to go in.

Start with: cd shop`)
