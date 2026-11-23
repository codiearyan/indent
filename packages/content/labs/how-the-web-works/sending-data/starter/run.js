// Starts the cupboard server, runs your functions from src/send.js against it and prints what was
// said. Run it with: node run.js
import { startStation } from './server/station.js'
import { addRequest, requestAddress, tryRequest } from './src/send.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

await station.run('Task 1: addRequest for Night Bus Home', () =>
  addRequest(station.base, 'Night Bus Home', 'Wyn, driving the last bus')
)
await station.run('Task 2: requestAddress for 50% Chance of Rain', () =>
  requestAddress(station.base, '50% Chance of Rain', 'the allotment society')
)
await station.run('Task 3: tryRequest for Rain on the Allotment', () =>
  tryRequest(station.base, 'Rain on the Allotment', 'Saoirse')
)
await station.run('Task 3: tryRequest for Weather for Ducks, already on the list', () =>
  tryRequest(station.base, 'Weather for Ducks', 'Bram, who is nine')
)
await station.run('Task 3: tryRequest with no name', () =>
  tryRequest(station.base, 'Seven Bridges')
)

await station.stop()
