// Run with: node src/demo.js
import { getForecast } from './services.js'
import { loadRoutes } from './loadRoutes.js'
import { portStatus } from './portStatus.js'
import { withTimeout } from './withTimeout.js'

async function show(label, run) {
  const started = Date.now()
  try {
    const value = await run()
    console.log(label, JSON.stringify(value), `(${Date.now() - started} ms)`)
  } catch (err) {
    console.log(label, `${err.name}: ${err.message}`, `(${Date.now() - started} ms)`)
  }
}

await show('three routes:', () => loadRoutes(['quay-gull', 'quay-heron', 'gull-heron']))
await show('with a closed route:', () => loadRoutes(['quay-gull', 'reef-quay', 'gull-heron']))
await show('port status:', () => portStatus(['quay', 'gull', 'heron', 'reef']))
await show('forecast within 2000 ms:', () => withTimeout(getForecast(), 2000))
await show('forecast within 500 ms:', () => withTimeout(getForecast(), 500))
