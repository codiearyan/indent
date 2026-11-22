// Starts the cupboard server, runs your functions from src/requests.js against it and prints what
// was said. Run it with: node run.js
import { startStation, STUDIO_KEY } from './server/station.js'
import { requestLine, removeRequest, removeAsStudio, fetchAs } from './src/requests.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

await station.run('Task 1: requestLine', () => requestLine('delete', `${station.base}/requests/41`))
await station.run('Task 1: requestLine with a question mark part', () =>
  requestLine('get', `${station.base}/shows?day=saturday`)
)
await station.run('Task 2: removeRequest 43', () => removeRequest(station.base, 43))
await station.run('Task 3: removeAsStudio 43 with the studio key', () =>
  removeAsStudio(station.base, 43, STUDIO_KEY)
)
await station.run('Task 3: removeAsStudio 42 with a wrong key', () =>
  removeAsStudio(station.base, 42, 'not-the-key')
)
await station.run('Task 4: fetchAs text/html', () =>
  fetchAs(station.base, '/shows?day=saturday', 'text/html')
)
await station.run('Task 4: fetchAs text/plain', () =>
  fetchAs(station.base, '/shows?day=saturday', 'text/plain')
)

await station.stop()
