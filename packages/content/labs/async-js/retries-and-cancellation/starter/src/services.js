// Fake Tidewell harbour server. It is busy more often than not.
const calls = {}

const busy = (message) => Object.assign(new Error(message), { retryable: true })

// Fails twice with a retryable error, then answers. Unknown sailings fail for good.
export function fetchManifest(sailingId, { signal } = {}) {
  calls[sailingId] = (calls[sailingId] ?? 0) + 1
  const call = calls[sailingId]
  console.log(`  fetchManifest ${sailingId}, call ${call}`)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!sailingId.startsWith('S')) reject(new Error(`No sailing ${sailingId}`))
      else if (call <= 2) reject(busy(`Harbour server busy (call ${call})`))
      else resolve({ sailingId, passengers: 38 })
    }, 50)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}
