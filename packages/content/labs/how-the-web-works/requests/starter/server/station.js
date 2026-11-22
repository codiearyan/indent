// The cupboard server of Heronsgate Community Radio. It holds the programme listings and the song
// requests, and it answers in plain text. You do not need to change anything here, but you are
// welcome to read it: every answer you see in the terminal comes from this file.
//
// run.js starts it on a free port of this computer, runs your functions against it, prints every
// request it receives and every answer it sends, and stops it again.
import { createServer } from 'node:http'
import { inspect } from 'node:util'

export const STUDIO_KEY = 'heron-studio-7'

const shows = [
  { slug: 'dawn-chorus', name: 'Dawn Chorus', presenter: 'Odette', day: 'weekdays', time: '07:00' },
  {
    slug: 'allotment-hour',
    name: 'Allotment Hour',
    presenter: 'Saoirse',
    day: 'wednesday',
    time: '18:00'
  },
  {
    slug: 'saltings-late-show',
    name: 'The Saltings Late Show',
    presenter: 'Ffion',
    day: 'saturday',
    time: '22:00'
  },
  {
    slug: 'brass-on-sunday',
    name: 'Brass on Sunday',
    presenter: 'Gethin',
    day: 'sunday',
    time: '11:00'
  }
]

const songs = [
  { artist: 'Mabli & the Moths', title: 'Seven Bridges' },
  { artist: 'Mabli & the Moths', title: 'Night Bus Home' },
  { artist: 'Mabli & the Moths', title: 'Rain on the Allotment' },
  { artist: 'The Glasshouse Choir', title: 'Tin Whistle Morning' },
  { artist: 'Sixpence Static', title: '50% Chance of Rain' },
  { artist: 'Hale + Holloway', title: 'Weather for Ducks' }
]

const requests = new Map([
  [41, { song: 'Seven Bridges', from: 'Nia in Pellow Street' }],
  [42, { song: 'Tin Whistle Morning', from: 'the Thursday knitting group' }],
  [43, { song: 'Weather for Ducks', from: 'Bram, who is nine' }]
])

const PAGE_SIZE = 2

// The server restarts every night, and for its first two answers to the playlist it is not ready.
let playlistAsks = 0

const showLine = (s) => `${s.name}, ${s.day} at ${s.time}, with ${s.presenter}`

function answer(req) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname
  const q = url.searchParams

  if (path === '/' && req.method === 'GET') {
    return [200, 'Heronsgate Community Radio. This is the cupboard server.']
  }
  if (path === '/ping' && req.method === 'GET') {
    return [204, '', null]
  }
  if (path === '/now' && req.method === 'GET') {
    return [200, 'Now playing: Seven Bridges by Mabli & the Moths']
  }
  if (path === '/shows' && req.method === 'GET') {
    const day = q.get('day')
    const list = day ? shows.filter((s) => s.day === day) : shows
    if (/text\/html/.test(req.headers.accept ?? '')) {
      const items = list.map((s) => `  <li>${showLine(s)}</li>`).join('\n')
      return [200, `<ul>\n${items}\n</ul>`, 'text/html; charset=utf-8']
    }
    if (list.length === 0) return [200, `No shows on ${day}.`]
    return [200, list.map(showLine).join('\n')]
  }
  if (path.startsWith('/shows/') && req.method === 'GET') {
    const slug = path.slice('/shows/'.length)
    if (slug === 'test-card')
      return [500, 'The listings file has a broken line, so this show cannot be read.']
    const show = shows.find((s) => s.slug === slug)
    if (!show) return [404, `No show called ${slug} on the schedule.`]
    return [200, showLine(show)]
  }
  if (path === '/songs/search' && req.method === 'GET') {
    const artist = q.get('artist')
    const title = q.get('title')
    if (!artist)
      return [400, 'Say which artist to look for, with artist in the question mark part.']
    const found = songs.filter(
      (s) =>
        s.artist === artist &&
        (title === null || s.title.toLowerCase().includes(title.toLowerCase()))
    )
    const page = Number(q.get('page') ?? '1')
    const shown = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const looked = `Looked for artist "${artist}"${title === null ? '' : ` and title "${title}"`}, page ${page}.`
    if (shown.length === 0) return [200, `${looked}\nNo songs found.`]
    return [200, `${looked}\n${shown.map((s) => `${s.title} by ${s.artist}`).join('\n')}`]
  }
  if (path === '/requests' && req.method === 'GET') {
    if (requests.size === 0) return [200, 'No song requests.']
    return [200, [...requests].map(([id, r]) => `${id}: ${r.song}, for ${r.from}`).join('\n')]
  }
  if (path.startsWith('/requests/')) {
    const id = Number(path.slice('/requests/'.length))
    if (!requests.has(id)) return [404, `No song request number ${id}.`]
    if (req.method === 'GET') return [200, `${requests.get(id).song}, for ${requests.get(id).from}`]
    if (req.method !== 'DELETE')
      return [405, 'A song request can be read with GET or removed with DELETE.']
    const auth = req.headers.authorization
    if (!auth) return [401, 'Only the studio may remove a request. Send the studio key.']
    if (auth !== `Bearer ${STUDIO_KEY}`) return [403, 'That is not the studio key.']
    requests.delete(id)
    return [200, `Request ${id} is off the list.`]
  }
  if (path === '/playlist/tonight' && req.method === 'GET') {
    playlistAsks += 1
    if (playlistAsks <= 2) return [503, 'Restarting, ask again in a moment.']
    return [200, 'Tonight: Seven Bridges, Weather for Ducks, Tin Whistle Morning']
  }
  return [404, `Nothing at ${path} on the cupboard server.`]
}

function printRequest(ex) {
  console.log('  request')
  console.log(`    ${ex.method} ${ex.target} HTTP/1.1`)
  for (let i = 0; i < ex.rawHeaders.length; i += 2) {
    console.log(`    ${ex.rawHeaders[i]}: ${ex.rawHeaders[i + 1]}`)
  }
  if (ex.body) console.log(`\n    ${ex.body}`)
}

function printAnswer(ex) {
  console.log('  answer')
  console.log(`    HTTP/1.1 ${ex.status} ${ex.reason}`)
  for (const [name, value] of Object.entries(ex.headers)) console.log(`    ${name}: ${value}`)
  if (!ex.text) return
  console.log('')
  for (const line of ex.text.split('\n')) console.log(`    ${line}`)
}

function shown(value) {
  if (value instanceof Response) {
    return `the whole answer (a Response with status ${value.status}), not something read from it`
  }
  return inspect(value, { depth: 4 })
}

/** Starts the cupboard server on a free port of this computer. */
export function startStation() {
  const log = []
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const [status, text, type = 'text/plain; charset=utf-8'] = answer(req)
      const headers = { 'content-length': Buffer.byteLength(text) }
      if (type) headers['content-type'] = type
      res.writeHead(status, headers)
      res.end(text)
      log.push({
        method: req.method,
        target: req.url,
        rawHeaders: req.rawHeaders,
        body,
        status,
        reason: res.statusMessage,
        headers,
        text
      })
    })
  })

  // A request the server cannot read at all, like one with a method it does not know.
  server.on('clientError', (err, socket) => {
    log.push({ unreadable: err.code })
    socket.end('HTTP/1.1 400 Bad Request\r\ncontent-length: 0\r\n\r\n')
  })

  return new Promise((resolve) => {
    server.listen(0, 'localhost', () => {
      const base = `http://localhost:${server.address().port}`
      resolve({
        base,

        /** Runs one task's example and prints the conversation it had with the server. */
        async run(title, example) {
          console.log(`\n${title}`)
          log.length = 0
          let outcome
          try {
            outcome = `your function gave back: ${shown(await example())}`
          } catch (err) {
            if (err?.message === 'Not implemented') return console.log('  not written yet')
            const cause = err?.cause ? ` (${err.cause.code ?? err.cause.message})` : ''
            outcome = `your function stopped with ${err?.name}: ${err?.message}${cause}`
          }
          if (log.length === 0) console.log('  no request was sent')
          for (const ex of log) {
            if (ex.unreadable) {
              console.log(
                `  a request the server could not read (${ex.unreadable}), so it answered 400 Bad Request`
              )
              continue
            }
            printRequest(ex)
            printAnswer(ex)
          }
          console.log(`  ${outcome.replaceAll('\n', '\n  ')}`)
        },

        stop() {
          server.closeAllConnections()
          return new Promise((done) => server.close(done))
        }
      })
    })
  })
}
