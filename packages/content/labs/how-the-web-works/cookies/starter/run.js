// Starts the cupboard server, runs your functions from src/cookies.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { playlistAs, cookieHeader, sessionCookie, whoIsThis } from './src/cookies.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const hours = (n) => n * 60 * 60 * 1000
const now = Date.now()

// What the studio app does today: it signs in, then asks for the playlist without the cookies.
await station.run(
  'Signing in, then asking for the playlist as the studio app does today',
  async () => {
    await fetch(`${station.base}/studio/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ presenter: 'Ffion', key: 'saltings-22' })
    })
    return (await fetch(`${station.base}/studio/playlist`)).text()
  }
)

await station.run('Task 1: playlistAs Ffion', () =>
  playlistAs(station.base, 'Ffion', 'saltings-22')
)
await station.run('Task 1: playlistAs Ffion, with the wrong key', () =>
  playlistAs(station.base, 'Ffion', 'not-the-key')
)

// The cookies a browser in the studio keeps for the station's website.
const jar = [
  {
    name: 'session',
    value: '5f1c0e',
    domain: 'heronsgate-radio.example',
    hostOnly: true,
    path: '/studio',
    secure: true,
    httpOnly: true,
    expires: now + hours(8)
  },
  {
    name: 'presenter',
    value: 'Ffion',
    domain: 'heronsgate-radio.example',
    hostOnly: false,
    path: '/',
    secure: false,
    httpOnly: false,
    expires: now + hours(8)
  },
  {
    name: 'quiz',
    value: 'round-3',
    domain: 'heronsgate-radio.example',
    hostOnly: true,
    path: '/',
    secure: false,
    httpOnly: false,
    expires: now - hours(1)
  }
]
for (const address of [
  'https://heronsgate-radio.example/studio/playlist',
  'https://heronsgate-radio.example/shows',
  'https://shop.heronsgate-radio.example/mugs',
  'http://heronsgate-radio.example/studio/playlist'
]) {
  await station.run(`Task 2: cookieHeader for ${address}`, () => cookieHeader(jar, address, now))
}

await station.run('Task 3: sessionCookie for a sign-in, eight hours, under /studio', () =>
  sessionCookie('5f1c0e', '/studio', 8 * 60 * 60)
)

const sessions = {
  '5f1c0e': { presenter: 'Ffion', expires: now + hours(8) },
  '9a7d22': { presenter: 'Gethin', expires: now - hours(2) }
}
for (const cookie of [
  'session=5f1c0e; presenter=Ffion',
  'presenter=Odette',
  'session=9a7d22',
  null
]) {
  await station.run(`Task 4: whoIsThis for cookie: ${cookie}`, () =>
    whoIsThis(cookie, sessions, now)
  )
}

await station.stop()
