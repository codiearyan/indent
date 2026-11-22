// Starts the cupboard server, runs your functions from src/answers.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { statusLine, contentType, readAnswer } from './src/answers.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

await station.run('Task 1: statusLine for /now', () => statusLine(`${station.base}/now`))
await station.run('Task 1: statusLine for a show that is not there', () =>
  statusLine(`${station.base}/shows/midnight-quiz`)
)
await station.run('Task 2: contentType for /now', () => contentType(`${station.base}/now`))
await station.run('Task 2: contentType for /ping', () => contentType(`${station.base}/ping`))
await station.run('Task 3: readAnswer for a show', () =>
  readAnswer(`${station.base}/shows/saltings-late-show`)
)
await station.run('Task 3: readAnswer for the test card', () =>
  readAnswer(`${station.base}/shows/test-card`)
)
await station.run('Task 3: readAnswer for /ping', () => readAnswer(`${station.base}/ping`))

await station.stop()
