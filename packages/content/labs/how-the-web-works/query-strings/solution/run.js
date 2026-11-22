// Starts the cupboard server, runs your functions from src/search.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { queryValue, searchAddress, searchSongs, nextPage } from './src/search.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const sent = `${station.base}/songs/search?artist=Mabli+%26+the+Moths&title=bridges`
await station.run(`Task 1: queryValue, artist from ${sent}`, () => queryValue(sent, 'artist'))
await station.run('Task 1: queryValue, a name that is not there', () => queryValue(sent, 'page'))
await station.run('Task 2: searchAddress', () =>
  searchAddress(station.base, 'Mabli & the Moths', 'night')
)
await station.run('Task 2: searchAddress with no title', () =>
  searchAddress(station.base, 'Hale + Holloway')
)
await station.run('Task 3: searchSongs', () => searchSongs(station.base, 'Mabli & the Moths'))
await station.run('Task 3: searchSongs with a title', () =>
  searchSongs(station.base, 'Sixpence Static', '50%')
)

const first = `${station.base}/songs/search?artist=Mabli+%26+the+Moths`
await station.run('Task 4: nextPage', () => nextPage(first))
await station.run('Task 4: asking the server for the page nextPage gave', async () => {
  const response = await fetch(nextPage(first))
  return await response.text()
})

await station.stop()
