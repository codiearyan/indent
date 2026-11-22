// Starts the cupboard server, runs your functions from src/statuses.js against it and prints what
// was said. Run it with: node run.js
import { startStation } from './server/station.js'
import { statusFamily, showText, fetchWithRetry } from './src/statuses.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

for (const status of [200, 404, 503, 302, 42]) {
  await station.run(`Task 1: statusFamily(${status})`, () => statusFamily(status))
}
await station.run('Task 2: showText for brass-on-sunday', () =>
  showText(station.base, 'brass-on-sunday')
)
await station.run('Task 2: showText for midnight-quiz', () =>
  showText(station.base, 'midnight-quiz')
)
await station.run('Task 2: showText for the test card', () => showText(station.base, 'test-card'))
await station.run("Task 3: fetchWithRetry for tonight's playlist, 3 tries", () =>
  fetchWithRetry(`${station.base}/playlist/tonight`, 3)
)
await station.run('Task 3: fetchWithRetry for midnight-quiz, 3 tries', () =>
  fetchWithRetry(`${station.base}/shows/midnight-quiz`, 3)
)

await station.stop()
