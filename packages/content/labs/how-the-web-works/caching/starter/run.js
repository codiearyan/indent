// Starts the cupboard server, runs your functions from src/cache.js against it and prints what was
// said. Run it with: node run.js
import { startStation } from './server/station.js'
import { keepRules, isFresh, refresh, listings } from './src/cache.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const minutes = (n) => n * 60 * 1000
const start = Date.now()

for (const path of ['/api/listings', '/api/now-playing', '/shows']) {
  let header = null
  await station.run(`What ${path} says about keeping it`, async () => {
    header = (await fetch(`${station.base}${path}`)).headers.get('cache-control')
    return header
  })
  await station.run(`Task 1: keepRules for the cache-control of ${path}`, () => keepRules(header))
}

const kept = {
  body: '[{"slug":"dawn-chorus","name":"Dawn Chorus"}]',
  etag: null,
  cacheControl: 'max-age=600',
  storedAt: start
}
await station.run('Task 2: isFresh for a copy of the listings, 4 minutes later', () =>
  isFresh(kept, start + minutes(4))
)
await station.run('Task 2: isFresh for the same copy, 15 minutes later', () =>
  isFresh(kept, start + minutes(15))
)

let copy = null
await station.run('Task 3: refresh /api/listings with nothing kept yet', async () => {
  copy = await refresh(`${station.base}/api/listings`, null, start)
  return copy
})
await station.run('Task 3: refresh /api/listings again, with the copy it gave back', () =>
  refresh(`${station.base}/api/listings`, copy, start + minutes(1))
)

// One studio screen asks for the listings now, ten seconds later and eleven minutes later.
let shown = null
for (const [when, label] of [
  [0, 'now'],
  [10 * 1000, '10 seconds later'],
  [minutes(11), '11 minutes later']
]) {
  await station.run(`Task 4: listings for a studio screen, ${label}`, async () => {
    shown = await listings(`${station.base}/api/listings`, shown, start + when)
    return shown
  })
}

await station.stop()
