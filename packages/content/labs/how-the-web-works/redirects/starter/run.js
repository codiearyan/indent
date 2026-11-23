// Starts the cupboard server, runs your functions from src/redirects.js against it and prints
// what was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { redirectKind, whereTo, trail } from './src/redirects.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

// What happens to a song request posted to each of the old form addresses.
for (const old of ['/request-a-song', '/song-request']) {
  await station.run(`A song request posted to the old address ${old}`, async () => {
    const response = await fetch(`${station.base}${old}`, {
      method: 'POST',
      body: new URLSearchParams({ song: 'Night Bus Home', from: 'Wyn' })
    })
    return `${response.status}: ${await response.text()}`
  })
}

for (const status of [301, 307, 200]) {
  await station.run(`Task 1: redirectKind(${status})`, () => redirectKind(status))
}
await station.run('Task 2: whereTo for /listings', () => whereTo(`${station.base}/listings`))
await station.run('Task 2: whereTo for /shows', () => whereTo(`${station.base}/shows`))
await station.run('Task 3: trail for /guide, at most 5 redirects', () =>
  trail(`${station.base}/guide`, 5)
)
await station.run('Task 3: trail for /schedule/old, at most 5 redirects', () =>
  trail(`${station.base}/schedule/old`, 5)
)

await station.stop()
