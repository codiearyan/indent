// Run with: node src/demo.ts
// Uses real timers, so it takes about a second.
import { debounce } from './debounce.ts'
import { throttle } from './throttle.ts'

const started = Date.now()
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
const log = (label: string) => (key: string): void => {
  console.log(`${String(Date.now() - started).padStart(4)} ms  ${label} ran with ${key}`)
}

async function typeKeys(label: string, make: () => (key: string) => void): Promise<void> {
  console.log(`\n${label}: keys a to f, one every 50 ms, wait 120 ms`)
  try {
    const handler = make()
    for (const key of 'abcdef') {
      handler(key)
      await sleep(50)
    }
    await sleep(300)
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`)
  }
}

await typeKeys('debounce', () => debounce(log('debounce'), 120))
await typeKeys('debounce, leading', () => debounce(log('leading'), 120, { leading: true }))
await typeKeys('throttle', () => throttle(log('throttle'), 120))
