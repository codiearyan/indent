// Run with: node src/demo.js
import { fetchManifest } from './services.js'
import { retry } from './retry.js'

async function show(label, run) {
  const started = Date.now()
  console.log(label)
  try {
    const value = await run()
    console.log(' ', JSON.stringify(value), `(${Date.now() - started} ms)`)
  } catch (err) {
    console.log(' ', `${err.name}: ${err.message}`, `(${Date.now() - started} ms)`)
  }
}

await show('manifest for S1, the server is busy twice:', () =>
  retry(({ signal }) => fetchManifest('S1', { signal }))
)
await show('manifest for X9, which does not exist:', () =>
  retry(({ signal }) => fetchManifest('X9', { signal }))
)
await show('manifest for S2, cancelled after 120 ms:', () => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 120)
  return retry(({ signal }) => fetchManifest('S2', { signal }), { signal: controller.signal })
})
await new Promise((resolve) => setTimeout(resolve, 1000))
console.log('one second later: no more calls should appear above this line')
