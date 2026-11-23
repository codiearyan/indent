// Starts the cupboard server, runs your functions from src/json.js against it and prints what was
// said. Run it with: node run.js
import { startStation } from './server/station.js'
import { showLine, showNames, readJson } from './src/json.js'

const station = await startStation()
console.log(`The cupboard server is listening at ${station.base}`)

const teaToast =
  '{"slug":"tea-toast-and-tunes","name":"Tea, Toast and Tunes","presenter":"Odette","day":"friday","time":"09:00"}'
await station.run('Task 1: showLine for Tea, Toast and Tunes', () => showLine(teaToast))
await station.run('Task 2: showNames', () => showNames(station.base))
await station.run('Task 3: readJson for /api/shows/dawn-chorus', () =>
  readJson(`${station.base}/api/shows/dawn-chorus`)
)
await station.run('Task 3: readJson for /shows/dawn-chorus', () =>
  readJson(`${station.base}/shows/dawn-chorus`)
)
await station.run('Task 3: readJson for /api/now', () => readJson(`${station.base}/api/now`))

await station.stop()
