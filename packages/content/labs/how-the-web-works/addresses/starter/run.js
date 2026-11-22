// Starts the cupboard server, runs your functions from src/address.js against it and prints
// what was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { addressParts, pageAddress, fetchText } from './src/address.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

await station.run('Task 1: addressParts', () =>
  addressParts('https://listen.heronsgate.example/shows/dawn-chorus')
)
await station.run('Task 1: addressParts, the cupboard server', () =>
  addressParts(station.base + '/now')
)
await station.run('Task 2: pageAddress', () => pageAddress(station.base, '/shows'))
await station.run('Task 3: fetchText', () => fetchText(station.base + '/now'))
await station.run('Task 2 and 3 together', () => fetchText(pageAddress(station.base, '/shows')))

await station.stop()
