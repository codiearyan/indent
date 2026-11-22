// Builds the shop's folder, shop/, with the website as Femi keeps it: plain files and no history.
// Run it in the top folder with: node setup.mjs
// Running it again empties shop/, history and all, and starts the issue over.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const top = import.meta.dirname
const shop = join(top, 'shop')
const write = (file, text) => writeFileSync(join(shop, file), text)

// A repository made by mistake in the top folder would hold the app's own files.
rmSync(join(top, '.git'), { recursive: true, force: true })
// Emptied rather than removed, so a terminal sitting in shop/ keeps a folder to stand in.
mkdirSync(shop, { recursive: true })
for (const entry of readdirSync(shop)) rmSync(join(shop, entry), { recursive: true, force: true })

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
  'The Tidecaller\'s Almanac, Hal Oyelaran, hardback, £7.50',
  'Notes from a Copper Town, Margit Svensen, paperback, £3.00'
]

const events = page(
  'Reading group',
  '  <h1>Reading group</h1>\n  <p>We meet on the first Thursday of the month at 18:30, among the shelves.</p>\n  <p>This month: Seven Lamps on Quillon Street. Tea is on the shop.</p>\n' +
    back
)

write('index.html', index(homeLinks))
write('visit.html', visit({ details: [address], hours: [weekdays, 'Saturday: 10:00 to 17:00', sunday] }))
write('finds.html', finds(march))
write('style.css', style)

console.log(`The shop's folder is ready in shop/: four files and no history yet.

Wilma wants a history of the site that does not depend on copies of the folder.
Make shop a repository, tell Git who you are there, save the whole site in a
first commit, then change the Saturday hours in a commit of its own.

Start with: cd shop`)
